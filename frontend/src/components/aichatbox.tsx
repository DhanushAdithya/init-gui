"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

function AIChatBox(props: {
  response: {
    commands: string[];
    errors: string[];
    results: string[];
    message: string[];
  };
  variant?: "error" | "success" | "explain";
}) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    const code = props.response.commands.join("\n");

    codeToHtml(code, {
      lang: "shell",
      theme: "one-dark-pro",
    }).then(setHtml);
  }, [props]);

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-start w-full">
        <details
          className={`${
            props.variant === "error"
              ? "bg-red-300"
              : props.variant === "success"
                ? "bg-green-300"
                : "bg-blue-300"
          } w-full dark:bg-gray-700 py-2 px-4 text-sm whitespace-pre-wrap`}
        >
          <summary className="cursor-pointer outline-none list-none whitespace-pre-wrap">
            {props.variant === "error"
              ? "Your query is either missing the necessary program to achieve your use case or the information needed is not sufficient to execute the task. Please click to see further steps"
              : props.response.message.filter(Boolean).length > 0
                ? "Your query is processed and can be achieved but some of the steps are needed to be taken care by you. Click to see the steps to carry on further"
                : "The task has been completed successfully! Please click to see what has been executed to complete the task."}
          </summary>
          <hr className="my-2 border-gray-600" />
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <div>
            <div>Results</div>
            {props.response.results.filter(Boolean).map((result, idx) => (
              <li key={"" + idx + result}>{result}</li>
            ))}
            <div>Messages</div>
            {props.response.message.filter(Boolean).map((msg, idx) => (
              <li key={"" + idx + msg}>{msg}</li>
            ))}
            <div>Errors</div>
            {props.response.errors.filter(Boolean).map((result, idx) => (
              <li key={"" + idx + result}>{result}</li>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

export default AIChatBox;
