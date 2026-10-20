"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@via-ds/components/button";
import { Dialog, DialogRoot } from "@via-ds/components/dialog";
import { Icon } from "@via-ds/icons";
import { Content, Header } from "@via-ds/components/structure";
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@via-ds/components/tabs";
import { H3, Text } from "@via-ds/components/typography";
import { TALK_TRACK } from "@/lib/const/talkTrack";

const InfoWizard = ({
  title = "Learn more",
  iconGlyph = "Wizard",
  sections = TALK_TRACK,
}) => {
  const [selected, setSelected] = useState(sections[0]?.heading);

  return (
    <DialogRoot>
      {/* Bigger button for navbars; a Button inside DialogRoot is the dialog trigger */}
      <Button className="m-[5px]">
        <Icon glyph={iconGlyph} />
        Tell me more!
      </Button>

      <Dialog>
        <Header>
          <Text slot="title">{title}</Text>
        </Header>
        <Content>
          <div className="overflow-y-auto h-[500px]">
            <Tabs
              aria-label="info wizard tabs"
              selectedKey={selected}
              onSelectionChange={(key) => setSelected(String(key))}
            >
              <TabList>
                {sections.map((tab) => (
                  <Tab key={tab.heading}>{tab.heading}</Tab>
                ))}
              </TabList>
              <TabPanels>
                {sections.map((tab) => (
                  <TabPanel key={tab.heading}>
                    {tab.content.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="mb-4">
                        {section.heading && (
                          <H3
                            style={{
                              marginTop: "20px",
                              marginBottom: "10px",
                            }}
                          >
                            {section.heading}
                          </H3>
                        )}
                        {section.body &&
                          (Array.isArray(section.body) ? (
                            <ul className="list-disc pl-6">
                              {section.body.map((item, idx) =>
                                typeof item == "object" ? (
                                  <li key={idx}>
                                    {item.heading}
                                    <ul className="list-disc pl-6">
                                      {item.body?.map((subItem, idx) => (
                                        <li key={idx}>
                                          <Text textStyle="body">
                                            {subItem}
                                          </Text>
                                        </li>
                                      ))}
                                    </ul>
                                  </li>
                                ) : (
                                  <li key={idx}>
                                    <Text textStyle="body">{item}</Text>
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <Text textStyle="body">{section.body}</Text>
                          ))}

                        {section.image && (
                          <div className="relative w-full h-[400px] flex justify-center items-center">
                            <Image
                              src={section.image.src}
                              alt={section.image.alt}
                              fill
                              sizes="(max-width: 768px) 90vw, 700px"
                              style={{
                                objectFit: "contain",
                                objectPosition: "center",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </div>
        </Content>
      </Dialog>
    </DialogRoot>
  );
};

export default InfoWizard;
