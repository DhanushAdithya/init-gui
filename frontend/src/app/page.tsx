"use client";
import "regenerator-runtime/runtime";
import { type FormEvent, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { Prompt, Initialize } from "../../wailsjs/go/main/App";
import { Quit, WindowMinimise } from "../../wailsjs/runtime/runtime";
import AIChatBox from "~/components/aichatbox";

type Message = {
  type: "user" | "ai";
  message?: string;
  response: {
    commands: string[];
    errors: string[];
    results: string[];
    message: string[];
  };
  variant?: "success" | "explain" | "error";
};

export default function Component() {
  const { transcript, listening } = useSpeechRecognition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Initialize();
  }, []);

  useEffect(() => {
    setMsg(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const handleSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (msg) {
      const query = msg;
      if (query.trim().length > 0) {
        setLoading(true);
        setMessages((prev) => [
          ...prev,
          {
            type: "user",
            message: query,
            response: {
              commands: [],
              errors: [],
              results: [],
              message: [],
            },
          },
        ]);
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight + 100,
          behavior: "smooth",
        });
        const {
          messages: msgs,
          isError,
          errors,
          commands,
          results,
        } = await Prompt(query);
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            response: { commands, errors, results, message: msgs },
            variant: isError
              ? "error"
              : msgs.filter(Boolean).length > 0
                ? "explain"
                : "success",
          },
        ]);
      }
      setMsg("");
    }
  };

  return (
    <div className="relative flex flex-col max-w-[720px] h-screen mx-auto border border-gray-200 dark:border-gray-800">
      {/* Title Bar */}
      <div
        className="w-screen gap-x-2 absolute flex items-center justify-end top-0 left-0 bg-gray-50 py-1 px-2 select-none"
        style={{ "--wails-draggable": "drag" } as React.CSSProperties}
      >
        <button
          onClick={WindowMinimise}
          className="bg-yellow-300 hover:bg-yellow-400 w-5 h-5 rounded-full flex items-center justify-center transition"
        >
          <span className="relative">-</span>
        </button>
        <button
          onClick={Quit}
          className="bg-red-300 hover:bg-red-400 w-5 h-5 rounded-full flex items-center justify-center transition"
        >
          <span
            className="relative"
            style={{
              top: "-.9px",
            }}
          >
            ×
          </span>
        </button>
      </div>
      {/* Chat Container */}
      <div
        className="flex-1 flex flex-col gap-2 overflow-y-scroll scrollbar-hide mt-9"
        ref={scrollRef}
      >
        {messages.map((message, index) => {
          return message.type === "ai" ? (
            <AIChatBox
              key={index}
              response={message.response}
              variant={message.variant}
            />
          ) : (
            <UserChatBox key={index} message={message.message as string} />
          );
        })}
        {loading && <Loading />}
      </div>
      {/* Form Container */}
      <div className="border-t border-gray-200 dark:border-gray-800 bottom-0">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center p-2">
            <div className="flex-1">
              <Input
                onChange={(evt) => {
                  setMsg(evt.target.value);
                }}
                value={msg}
                className="border-0 bg-gray-200"
                id="message"
                placeholder="Type your message..."
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="ml-2" size="icon">
              <PlaneIcon className="w-4 h-4" />
              <span className="sr-only">Send</span>
            </Button>
            <Button
              className={`ml-2 ${
                listening && "bg-green-400 hover:bg-green-400"
              }`}
              size="icon"
              type="button"
              variant="secondary"
              onClick={() => {
                if (listening) SpeechRecognition.stopListening();
                else SpeechRecognition.startListening();
              }}
            >
              <MicIcon className="w-4 h-4" />
              <span className="sr-only">Voice</span>
            </Button>
            <Button
              className="ml-2"
              size="icon"
              variant="destructive"
              onClick={() => {
                setMessages([]);
              }}
            >
              <ClearIcon className="w-4 h-4" />
              <span className="sr-only">Clear Chat</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MicIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function PlaneIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function ClearIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function UserChatBox(props: { message: string }) {
  return (
    <div className="flex items-start justify-end mx-2">
      <div className="flex flex-col items-end w-full">
        <div className="rounded-full bg-green-300 dark:bg-gray-800 px-4 py-2 text-sm max-w-[75%]">
          <p>{props.message}</p>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-start">
      <div className="flex flex-col items-start w-full">
        <div className="flex bg-blue-300 dark:bg-gray-700 p-2 pr-3 text-sm w-full">
          <div className="mr-2 w-5 h-5 rounded-full border-4 border-x-blue-200 border-b-blue-200 border-t-blue-500 animate-spin duration-300" />
          Loading ...
        </div>
      </div>
    </div>
  );
}
