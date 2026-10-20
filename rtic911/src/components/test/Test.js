"use client";

import React, { useState } from "react";
import { fetchTestDocuments } from "@/lib/db/test.js";
import { Banner } from "@via-ds/components/banner";
import { Button } from "@via-ds/components/button";
import { Body, Code, InlineCode } from "@via-ds/components/typography";

export default function Test() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const data = await fetchTestDocuments();
    setLoading(false);
    if (data.error) {
      setError(data.error);
      setResult(null);
    } else {
      setResult(data);
    }
  };

  // Success message
  const successMsg = (
    <Banner variant="success" className="mb-2">
      🎉 Demo template is ready! You can start building your app.
    </Banner>
  );

  // Error instructions
  const errorInstructions = (
    <Banner variant="danger" className="mb-2">
      <Body>
        <strong>Could not connect to MongoDB.</strong>
      </Body>
      <Body>
        Please check your environment variables:{" "}
        <InlineCode>MONGODB_URI</InlineCode> and{" "}
        <InlineCode>DATABASE_NAME</InlineCode>.
      </Body>
      <Body>Error: {error}</Body>
    </Banner>
  );

  // Empty instructions
  const emptyInstructions = (
    <Banner variant="warning" className="mb-2">
      <Body>
        <strong>No data found in the test collection.</strong>
      </Body>
      <Body>
        Seed your test database, or change the collection name in{" "}
        <InlineCode>src/lib/db/test.js</InlineCode> if you are connected to a
        different database.
      </Body>
    </Banner>
  );

  return (
    <div className="max-w-xl mx-auto p-4">
      {error && errorInstructions}
      {!error &&
        result &&
        (Array.isArray(result) ? result.length === 0 : !result) &&
        emptyInstructions}
      {!error &&
        result &&
        (Array.isArray(result) ? result.length > 0 : !!result) &&
        successMsg}
      <Button onPress={handleClick} isDisabled={loading} variant="primary">
        {loading ? "Loading..." : "Run Test Query"}
      </Button>
      <div className="mt-4">
        {result && (!Array.isArray(result) || result.length > 0) && (
          <div
            className="p-2 overflow-x-auto"
            style={{
              backgroundColor: "var(--via-color-background-secondary)",
              borderRadius: "var(--via-border-radius-surface)",
            }}
          >
            <Code>{JSON.stringify(result, null, 2)}</Code>
          </div>
        )}
      </div>
    </div>
  );
}
