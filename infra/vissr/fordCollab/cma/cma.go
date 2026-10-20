/**
* (C) 2026 Ford Motor Company
*
* All files and artifacts in the repository at https://github.com/covesa/vissr
* are licensed under the provisions of the license provided by the LICENSE file in this repository.
*
**/

package main

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"flag"
	"io"
	"bytes"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"math/rand"
	"time"
	"maps"

	"github.com/akamensky/argparse"
	"github.com/covesa/vissr/utils"
	"github.com/gorilla/websocket"
)

var clientCert tls.Certificate
var caCertPool x509.CertPool

var CLOUD_URL = cloudUrl()  // the vehicle server emulates a cloud server unless CMA_CLOUD_URL is set, e.g. to the docker/cloud server

func cloudUrl() string {
	if url := os.Getenv("CMA_CLOUD_URL"); url != "" {
		return url
	}
	return "http://0.0.0.0:8888"
}
// Websocket session init data, ADDR must onl be defined once
var PORTNUM = "8080"
var ADDR = flag.String("addr", "localhost:"+PORTNUM, "http service address")
var EmergencyMessageId string
var terminateCMA bool

var vehicleChan chan map[string]interface{}
var cloudChan chan map[string]interface{}

var emergencyRequest1Map map[string]interface{}
var emergencyRequest2Map map[string]interface{}

type EmergencyData struct{
	Vehicle string
	Cloud string
}

// emergencyData1 shall contain the most critical crash data
var emergencyData1 = []EmergencyData{
					{"EmergencyMessageId", "CVED.AutomatedCrashNotification.CrashIncident.IncidentID"},  //must be first member in the array
					{"Vehicle.CurrentLocation.Latitude", "CVED.AutomatedCrashNotification.CrashIncident.Location.Latitude"},
					{"Vehicle.CurrentLocation.Longitude", "CVED.AutomatedCrashNotification.CrashIncident.Location.Longitude"},
					{"Vehicle.VehicleIdentification.LicensePlate", "CVED.AutomatedCrashNotification.CrashIncident.CrashVehicle.Registration.PlateNumber"},
					{"Vehicle.VehicleIdentification.Claim", "CVED.Context.Claim"},
					{"Vehicle.Occupant.Count", "CVED.Context.OccupantCount"},
					{"IncidentDateTime", "CVED.AutomatedCrashNotification.CrashIncident.IncidentDateTime"},  //set by the CMA to the ts of the airbag event
				 }

// emergencyData2 shall contain the other contextual crash data
var emergencyData2 = []EmergencyData{
					{"EmergencyMessageId", "CVED.AutomatedCrashNotification.CrashIncident.IncidentID"},  //must be first member in the array
					{"Occupant1.Identification.Name", "CVED.AutomatedCrashNotification.CrashIncident.CrashPersonRole.Person.PersonFullName"},
					{"Vehicle.Cabin.Seat.Row1.DriverSide.Weight", "CVED.Context.Occupant.Weight"},
					{"Occupant1.Position.SeatPosition.Row", "CVED.Context.Occupant.SeatPosition.Row"},
					{"Occupant1.Position.SeatPosition.Index", "CVED.Context.Occupant.SeatPosition.Index"},
					{"Occupant1.Position.SeatLayout.RowTotal", "CVED.Context.Vehicle.SeatLayout.RowTotal"},
					{"Occupant1.Position.SeatLayout.RowLayout", "CVED.Context.Vehicle.SeatLayout.RowLayout"},
					{"Vehicle.Speed", "CVED.Context.Vehicle.TimeSeries.Speed"},
					{"Vehicle.Acceleration.Longitudinal", "CVED.Context.Vehicle.TimeSeries.Acceleration.Longitudinal"},
					{"Vehicle.AngularVelocity.Roll", "CVED.Context.Vehicle.TimeSeries.AngularVelocity.Roll"},
				 }

// isCmaValue reports whether the CMA sets the value itself instead of reading it from the vehicle server
func isCmaValue(path string) bool {
	return path == "EmergencyMessageId" || path == "IncidentDateTime"
}

// setRequestValue sets the value of a data point in an emergency request
func setRequestValue(emergencyRequestMap map[string]interface{}, path string, value interface{}) {
	items, _ := emergencyRequestMap["data"].([]interface{})
	for _, item := range items {
		if m, ok := item.(map[string]interface{}); ok && m["path"] == path {
			m["value"] = value
		}
	}
}

func pathToUrl(path string) string {
	var url string = strings.Replace(path, ".", "/", -1)
	return "/" + url
}

func getNonce() string {
	return strconv.FormatUint(uint64(rand.Uint32()), 10)
}

func createEmergencyRequest(emergencyData []EmergencyData) map[string]interface{} {
	emergencyReq := `{"action": "set", "data":[{"path": "EmergencyMessageId", "value": "` + EmergencyMessageId + `"}, {`
	for i := 1; i < len(emergencyData); i++ {
		emergencyReq += `"path": "` + emergencyData[i].Vehicle + `", "value": ""}, {`
	}
	emergencyReq = emergencyReq[:len(emergencyReq)-3] + "]}"
	var reqMap map[string]interface{}
	utils.MapRequest(emergencyReq, &reqMap)
	return reqMap
}

func initWebSocket() *websocket.Conn {  // connects to the vehicle server
	scheme := "ws"
	if secConfig.TransportSec == "yes" {
		scheme = "wss"
		PORTNUM = secConfig.WsSecPort
		websocket.DefaultDialer.TLSClientConfig = &tls.Config{
			Certificates: []tls.Certificate{clientCert},
			RootCAs:      &caCertPool,
		}
	}
	dataSessionUrl := url.URL{Scheme: scheme, Host: *ADDR, Path: ""}
	subProtocol := make([]string, 1)
	subProtocol[0] = "VISSv2"
	dialer := websocket.Dialer{
		HandshakeTimeout: time.Second,
		ReadBufferSize:   1024,
		WriteBufferSize:  1024,
		Subprotocols:     subProtocol,
	}
	conn, _, err := dialer.Dial(dataSessionUrl.String(), nil)
	if err != nil {
		utils.Error.Printf("Data session dial error:%s\n", err)
		os.Exit(1)
	}
	return conn
}

func getWsResponse(conn *websocket.Conn, request []byte) string {
	err := conn.WriteMessage(websocket.BinaryMessage, request)
	if err != nil {
		utils.Error.Printf("Request error:%s\n", err)
		return ""
	}
	_, msg, err := conn.ReadMessage()
	if err != nil {
		utils.Error.Printf("Response error: %s\n", err)
		return ""
	}
	return string(msg)
}

func performWsRequest(command string, conn *websocket.Conn) (map[string]interface{}, chan map[string]interface{}) {  // supports get/set/subscribe/unsubscribe
	var subChan chan map[string]interface{}
	response := getWsResponse(conn, []byte(command))
	if strings.Contains(command, `"subscribe"`) && !strings.Contains(response, `"error"`){
		subChan = make(chan map[string]interface{}, 1)
		go subscribeSession(conn, subChan)
	}
	var respMap map[string]interface{}
	utils.MapRequest(response, &respMap)
	return respMap, subChan
}

func subscribeSession(conn *websocket.Conn, eventChan chan map[string]interface{}) {
	var eventMap map[string]interface{}
	for {
		_, event, err := conn.ReadMessage()
		if err != nil {
//			utils.Error.Printf("Event error: %s\n", err)
			return
		}
		utils.MapRequest(string(event), &eventMap)
		eventChan <- eventMap
		eventMap = nil
	}
}

func getCvedPath(path string) string {
	for i := 0; i < len(emergencyData1); i++ {
		if emergencyData1[i].Vehicle == path {
			return emergencyData1[i].Cloud
		}
	}
	for i := 0; i < len(emergencyData2); i++ {
		if emergencyData2[i].Vehicle == path {
			return emergencyData2[i].Cloud
		}
	}
//	utils.Error.Printf("%s not found in emergencyPaths", path)
	return ""
}

func mapToCVED(reqMap map[string]interface{}) map[string]interface{} {
//utils.Info.Printf("mapToCVED:reqMap=%s", reqMap)
	cvedMap := maps.Clone(reqMap)
	dataMap, ok := cvedMap["data"]
	if !ok {
		utils.Error.Printf("Emergency dataset map corrupt")
		return nil
	}
	items, _ := dataMap.([]interface{})
	for _, item := range items {
	    m, ok := item.(map[string]interface{})
	    if !ok {
	        continue
	    }
            if path, ok := m["path"].(string); ok {
            	cvedPath := getCvedPath(path)
            	if len(cvedPath) == 0 {
	            	m["path"] = path
            	} else {
            		m["path"] = cvedPath
            	}
            }
	}
	return cvedMap
}

func issueCloudRequest(reqMap map[string]interface{}) string {
	cvedMap := mapToCVED(reqMap)
	var err error
	var req *http.Request
	url := CLOUD_URL
	if cvedMap["path"] != nil {
		url += "/" + cvedMap["path"].(string)
	}
	if cvedMap["action"] == "set" {
		var body string
		if cvedMap["path"] != nil {
			body = `{"value":"` + cvedMap["value"].(string) + `"}`
		} else {
			dataMapStr, _ := json.Marshal(cvedMap["data"])
			body = `{"data":` + string(dataMapStr) + `}`
		}
		utils.Info.Printf("HTTP Request: POST: %s %s\n", url, body)
		req, err = http.NewRequest("POST", url, bytes.NewBuffer([]byte(body)))
	} else {
		if cvedMap["filter"] != nil {
			filter, err2 := json.Marshal(cvedMap["filter"])
			if err2 != nil {
				utils.Error.Printf("Filter syntax error: %s\n", err2)
				return `{"error": {"description": "Internal error"}}`
			}
			url += `?filter=`+ string(filter)
		}
		utils.Info.Printf("HTTP Request: GET: %s\n", url)
		req, err = http.NewRequest("GET", url, nil)
	}
	if err != nil {
		utils.Error.Printf("HTTP request init error: %s\n", err)
		return `{"error": {"description": "Internal error"}}`
	}

	req.Header.Add("Content-Type", "application/json")
	client := &http.Client{}
	var resp *http.Response
	resp, err = client.Do(req)
	if err != nil {
		utils.Error.Printf("HTTP request call error: %s\n", err)
		return `{"error": {"description": "HTTP request error"}}`
	}
	defer resp.Body.Close()

	var bdy []byte
	bdy, err = io.ReadAll(resp.Body)
	if err != nil {
		utils.Error.Printf("HTTP response decode error: %s\n", err)
		return `{"error": {"description": "HTTP response error"}}`
	}
	utils.Info.Printf("Response: %s, %s\n", resp.Status, string(bdy))
	return string(bdy)
}

func initVehicleClient(vehicleChan chan map[string]interface{}) {
	conn := initWebSocket()
	isReleasedRequest := `{"action":"subscribe","path":"Vehicle.Safety.Airbag.IsReleased","filter":{"variant":"change","parameter":{"logic-op":"gt", "diff":"0"}},"requestId":"233"}`
//	isReleasedRequest := `{"action":"subscribe","path":"Vehicle.Safety.Airbag.IsReleased","filter":{"variant":"timebased","parameter":{"period":"500"}},"requestId":"233"}`
	respMap, isReleasedChan := performWsRequest(isReleasedRequest, conn)
	if respMap["error"] != nil {
		utils.Error.Printf("IsReleased subscription failed")
		return
	}
	updateCounter := -1
	for {
		select {
			case eventMap := <- isReleasedChan:
				dataMap := eventMap["data"].(map[string]interface{})
				dpMap := dataMap["dp"].(map[string]interface{})
				if dpMap["value"] == "true" {
					setRequestValue(emergencyRequest1Map, "IncidentDateTime", dpMap["ts"])  // when the vehicle server got the airbag release
					time.Sleep(100 * time.Millisecond)
					utils.Info.Printf("The emergency data set is sent to the cloud server")
					issueCloudRequest(emergencyRequest1Map)
					issueCloudRequest(emergencyRequest2Map)
					terminateCMA = true
				}
			default:
				time.Sleep(100 * time.Millisecond)
				updateCounter++
				if updateCounter%10 == 0 {
					updateCounter = 0
					updateEmergencyRequest(emergencyRequest1Map)
					updateEmergencyRequest(emergencyRequest2Map)
				}
		}
	}
}

func updateEmergencyRequest(emergencyRequestMap map[string]interface{}) {
	conn := initWebSocket()
	defer conn.Close()
	dataMap, ok := emergencyRequestMap["data"]
	if !ok {
	    return
	}
	items, ok := dataMap.([]interface{})
	if !ok {
	    if mapItems, ok := dataMap.([]map[string]interface{}); ok {
	        for _, m := range mapItems {
	            if path, ok := m["path"].(string); ok {
	            	if !isCmaValue(path) {
	                respMap, err := createAndIssueRequest(path, conn)
		                if value, ok := responseValue(respMap); err == nil && ok {
		                    m["value"] = value
		                }
	            	}
	            }
	        }
	        return
	    }
	    return
	}
	for _, item := range items {
	    m, ok := item.(map[string]interface{})
	    if !ok {
	        continue
	    }
	    path, ok := m["path"].(string)
	    if !ok || isCmaValue(path) {
	        continue
	    }
	    respMap, err := createAndIssueRequest(path, conn)
	    if err != nil || respMap["error"] != nil {
		utils.Error.Printf("updateEmergencyRequest error")
	        continue
	    }
	    value, ok := responseValue(respMap)
	    if !ok {  // e.g. no data yet while the vehicle feeder starts, read it again in the next update
	        continue
	    }
	    m["value"] = value
	}
}

// responseValue returns the value of a get response, ok is false if the response has no data point
func responseValue(respMap map[string]interface{}) (interface{}, bool) {
	dataMap, ok := respMap["data"].(map[string]interface{})
	if !ok {
		return nil, false
	}
	dpMap, ok := dataMap["dp"].(map[string]interface{})
	if !ok {
		return nil, false
	}
	return dpMap["value"], true
}

func createAndIssueRequest(path string, conn *websocket.Conn) (map[string]interface{}, chan map[string]interface{}){
	req := `{"action": "get", "path": "` + path + `", "requestId": "123"}`
	return performWsRequest(req, conn)
}

func initCloudClient(cloudChan chan map[string]interface{}) {
// not needed?
}

func main() {
	// Create new parser object
	parser := argparse.NewParser("print", "Crash Monitor Agent")

	// Create flags
	logFile := parser.Flag("", "logfile", &argparse.Options{Required: false, Help: "outputs to logfile in ./logs folder"})
	logLevel := parser.Selector("", "loglevel", []string{"trace", "debug", "info", "warn", "error", "fatal", "panic"}, &argparse.Options{
		Required: false,
		Help:     "changes log output level",
		Default:  "info"})

	// Parse input
	err := parser.Parse(os.Args)
	if err != nil {
		utils.Error.Print(parser.Usage(err))
		//exits due to required info not provided by user
		os.Exit(1)
	}

	utils.InitLog("cma-log.txt", "./logs", *logFile, *logLevel)  //used in utils functions...

	readTransportSecConfig()
	utils.Info.Printf("secConfig.TransportSec=%s", secConfig.TransportSec)
	if secConfig.TransportSec == "yes" {
		caCertPool = *prepareTransportSecConfig()
	}

	terminateCMA = false
	EmergencyMessageId = getNonce()
	emergencyRequest1Map = createEmergencyRequest(emergencyData1)
	emergencyRequest2Map = createEmergencyRequest(emergencyData2)

	vehicleChan = make(chan map[string]interface{}, 1)
	cloudChan = make(chan map[string]interface{}, 1)

	time.Sleep(1 * time.Second)  //give the server some time to startup...

	go initVehicleClient(vehicleChan)

	go initCloudClient(cloudChan)

	for {
		if terminateCMA {
			utils.Info.Printf("Crash Monitor Agent successfully reported to cloud, so now it terminates")
			os.Exit(0)
		}
	}

}
