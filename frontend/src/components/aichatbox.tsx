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
  const [cmds, setCmds] = useState<string[]>([]);
  const [errs, setErrs] = useState<string[]>([]);
  const [rlts, setRlts] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<string[]>([]);

  useEffect(() => {
    setCmds(props.response.commands.filter(Boolean));
    setErrs(props.response.errors.filter(Boolean));
    setRlts(props.response.results.filter(Boolean));
    setMsgs(props.response.message.filter(Boolean));

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
              : msgs.length > 0
                ? "Your query is processed and can be achieved but some of the steps are needed to be taken care by you. Click to see the steps to carry on further"
                : <>
                                    The task has been completed successfully! Please click to see what has been executed to complete the task.
            {rlts && rlts.length > 0 && (
              <>
                <hr className="my-2 border-gray-600" />
                <div className="font-bold">Results</div>
                {rlts.map((result, idx) => (
                  <li key={"" + idx + result}>{result}</li>
                ))}
              </>
            )}
                                </>}
          </summary>
          <hr className="my-2 border-gray-600" />
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <div>
            {msgs && msgs.length > 0 && (
              <>
                <div>Messages</div>
                {msgs.map((msg, idx) => (
                  <li key={"" + idx + msg}>{msg}</li>
                ))}
              </>
            )}
            {errs && errs.length > 0 && (
              <>
                <div>Errors</div>
                {errs.map((error, idx) => (
                  <li key={"" + idx + error}>{error}</li>
                ))}
              </>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

export default AIChatBox;
