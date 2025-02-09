import { useCallback, useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { ControlBar, Editor, Frame, Panel } from "./components";
import { useConfig, useEvent } from "./hooks";
import { toPng, toBlob } from "html-to-image";
import download from "downloadjs";
import { getWebsocketHost } from "./utils";

const CODE_EMPTY_PLACEHOLDER = `print "Hello, CodeSnap.nvim!"`;
const WATER_MARK_PLACEHOLDER = "CodeSnap.nvim";
const PREVIEW_TITLE_PLACEHOLDER = "CodeSnap.nvim";

function App() {
  const [socketUrl] = useState(`ws://${getWebsocketHost()}/ws`);
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);
  const event = useEvent(lastMessage);
  const config = useConfig(event?.config_setup);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [isCopyButtonDisabled, setIsCopyButtonDisabled] = useState(false);

  const handleCopyButtonClick = useCallback(async () => {
    if (!frameRef.current) {
      return;
    }

    setIsCopyButtonDisabled(true);

    try {
      const blob = await toBlob(frameRef.current);
      const clipboardItem = new ClipboardItem({ "image/png": blob! });

      navigator.clipboard.write([clipboardItem]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCopyButtonDisabled(false);
    }
  }, []);

  const handleExportClick = useCallback(async () => {
    if (!frameRef.current) {
      return;
    }

    const dataURL = await toPng(frameRef.current);

    download(dataURL, "codesnap.png");
  }, []);

  const notifyCopyCommand = useCallback(async () => {
    if (!frameRef.current) {
      return;
    }

    const dataURL = await toPng(frameRef.current);

    sendMessage(dataURL);
  }, [sendMessage]);

  useEffect(() => {
    if (readyState !== ReadyState.OPEN || !event?.copy) {
      return;
    }

    notifyCopyCommand();
  }, [event, readyState, notifyCopyCommand]);

  useEffect(() => {
    document.title = config?.preview_title ?? PREVIEW_TITLE_PLACEHOLDER;
  }, [config?.preview_title]);

  return (
    <div className="w-full h-full flex flex-col items-center bg-deep-gray">
      <p className="rainbow-text text-4xl font-extrabold mt-20">
        CodeSnap.nvim
      </p>
      <Panel>
        <ControlBar
          isCopyButtonDisabled={isCopyButtonDisabled}
          onExportClick={handleExportClick}
          onCopyClick={handleCopyButtonClick}
          readyState={readyState}
        />
        <div id="frame" className="rounded-xl overflow-hidden">
          <Frame
            ref={frameRef}
            watermarkFontFamily={config?.watermark_font_family}
            watermark={config?.watermark ?? WATER_MARK_PLACEHOLDER}
          >
            <Editor
              codeFontFamily={config?.editor_font_family}
              language={event?.code?.language}
              macStyleTitleBar={config?.mac_window_bar}
            >
              {event?.code?.content ?? CODE_EMPTY_PLACEHOLDER}
            </Editor>
          </Frame>
        </div>
      </Panel>
      <a href="https://github.com/mistricky/codesnap.nvim">
        <svg
          role="img"
          viewBox="0 0 24 24"
          className="w-10 h-10 mt-10 fill-white opacity-50"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>GitHub</title>
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      </a>
    </div>
  );
}

export default App;
