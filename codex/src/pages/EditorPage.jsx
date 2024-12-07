import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Editor from "../comp/Editor";
import Client from "../comp/Client";
import { initSocket } from "../socket";
import logo from "../assets/code-logo.png";
import {
  Moon,
  Sun,
  Settings,
  Github,
  Users,
  Share2,
  Code2,
  Plus,
  Save,
  Layout,
  Download,
  Play,
} from "lucide-react";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";
import { executeCode } from "../api";

const Button = ({ children, onClick, className }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${className}`}
  >
    {children}
  </button>
);

const IconButton = ({ icon: Icon, onClick, className }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-md transition-colors ${className}`}
  >
    <Icon className="w-5 h-5" />
  </button>
);


export default function EditorPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const socketRef = useRef(null);
  const codeRef = useRef("");
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(
    location.state?.language || "javascript"
  );

  const languages = [
    { value: "javascript", label: "JavaScript (18.15.0)" },
    { value: "python", label: "Python (3.10.0)" },
    { value: "java", label: "Java (15.0.2)" },
    { value: "csharp", label: "C# (6.12.0)" },
    { value: "cpp", label: "C++ (10.2.0)" },
  ];

  const fileExtensionMapping = {
    cpp: "cpp",
    java: "java",
    python: "py",
    javascript: "js",
    typescript: "ts",
    csharp: "cs",
    php: "php",
  };

  const LANGUAGE_VERSIONS = {
    javascript: "18.15.0",
    typescript: "5.0.3",
    python: "3.10.0",
    java: "15.0.2",
    csharp: "6.12.0",
    php: "8.2.3",
    cpp: "10.2.0",
  };

  useEffect(() => {
    const init = async () => {
      try {
        socketRef.current = await initSocket();

        socketRef.current.on("connect_error", handleErrors);
        socketRef.current.on("connect_failed", handleErrors);

        function handleErrors(e) {
          console.log("socket error", e);
          toast.error("Socket connection failed, try again later.");
          reactNavigator("/");
        }

        socketRef.current.emit(ACTIONS.JOIN, {
          roomId,
          username: location.state?.username,
        });

        socketRef.current.on(
          ACTIONS.JOINED,
          ({ clients, username, socketId }) => {
            if (username !== location.state?.username) {
              toast.success(`${username} joined the room.`);
              console.log(`${username} joined`);
            }
            setClients(clients);
            socketRef.current.emit(ACTIONS.SYNC_CODE, {
              code: codeRef.current || "",
              socketId,
            });
          }
        );

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room.`);
          setClients((prev) =>
            prev.filter((client) => client.socketId !== socketId)
          );
        });
      } catch (error) {
        console.error("Socket initialization failed:", error);
        toast.error("Failed to initialize socket.");
      }
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
      }
    };
  }, [location.state?.username, reactNavigator, roomId]);

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the Room ID. You can copy it manually.");
      console.error(err);

      const roomIdDisplay = document.getElementById("roomIdDisplay");
      if (roomIdDisplay) {
        roomIdDisplay.textContent = `Room ID: ${roomId} (You can copy it from here)`;
        roomIdDisplay.style.display = "block";
      }
    }
  }

  function leaveRoom() {
    reactNavigator("/");
  }

  const [isRunning, setIsRunning] = useState(false);
  const [input, setInput] = useState("");

  const runCode = async () => {
    const code = codeRef.current;
    if (!code) {
      toast.error("No code to run");
      return;
    }

    setIsRunning(true);
    try {
      const response = await executeCode(selectedLanguage, code, input);
      setOutput(response.run.output);
    } catch (error) {
      toast.error("Error running the code");
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  // Function to clear the editor content
const clearEditorContent = () => {
  codeRef.current = ""; // Clear the reference value
  socketRef.current.emit(ACTIONS.SYNC_CODE, {
    code: "",
    socketId: socketRef.current.id,
  }); // Notify other clients in the room
  toast.success("Editor content cleared");
};

  const saveCode = async () => {
    const code = codeRef.current;
    if (!code) {
      toast.error("No code to save");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5100/save-code",
        {
          roomId,
          code,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success(response.data.message || "Code saved successfully!");
    } catch (error) {
      toast.error("Failed to save code");
      console.error("Save code error:", error);
    }
  };

  const exportCode = () => {
    const codeVal = codeRef.current.trim();
    if (!codeVal) {
      toast.error("No code to save");
      return;
    }
    const codeBlob = new Blob([codeVal], { type: "text/plain" });
    const downloadUrl = URL.createObjectURL(codeBlob);
    const codelink = document.createElement("a");
    codelink.href = downloadUrl;
    codelink.download = `code.${fileExtensionMapping[selectedLanguage]}`;
    codelink.click();
  };

  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div
      className={`h-screen overflow-hidden overscroll-none ${
        isDarkMode ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src={logo} alt="Codex Logo" className="h-9 w-11" />
            <h1 className="text-xl font-bold">CODEX</h1>
          </div>
          <div className="flex items-center space-x-4">
            <IconButton
              icon={isDarkMode ? Sun : Moon}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            />
            <IconButton
              icon={Settings}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            />
            <IconButton
              icon={Github}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={leaveRoom}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Sidebar */}
        <div className="w-64 p-4 border-r border-gray-800">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold mb-2 text-gray-400">
                Active Coders
              </h2>
              <div className="clientsList">
                {clients.map((client) => (
                  <Client key={client.socketId} username={client.username} />
                ))}
              </div>
            </div>
            <Button
              className="w-full bg-gray-800 hover:bg-gray-700 text-white"
              onClick={() => {}}
            >
              <Users className="inline-block w-4 h-4 mr-2" />
              Invite Collaborators
            </Button>
            <Button
              className="w-full bg-gray-800 hover:bg-gray-700 text-white"
              onClick={copyRoomId}
            >
              <Share2 className="inline-block w-4 h-4 mr-2" />
              Share Room
            </Button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <Button className="text-gray-300 hover:text-white hover:bg-gray-700">
                <Code2 className="inline-block w-4 h-4 mr-2" />
                Collaborate
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <IconButton
                icon={Save}
                className="text-gray-300 hover:text-white hover:bg-gray-700"
                onClick={saveCode}
              />
              <IconButton
                icon={Layout}
                className="text-gray-300 hover:text-white hover:bg-gray-700"
                onClick={clearEditorContent}
              />
            </div>
          </div>
          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
          />
        </div>

        {/* Output Panel */}
        <div className="w-96 flex flex-col border-l border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Output:</h2>
              <div className="flex items-center space-x-2">
              <select
              className="bg-gray-900 text-white border border-gray-700 rounded-md px-1 py-1"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="" disabled>
                Select Language
              </option>
              {Object.entries(LANGUAGE_VERSIONS).map(([lang, version]) => (
                <option key={lang} value={lang}>
                  {`${lang} (${version})`}
                </option>
              ))}
            </select>

                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={exportCode}
                >
                  <Download className="inline-block w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={runCode}
              >
                <Play className="inline-block w-4 h-4 mr-2" />
                Run Code
              </Button>
             
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {isRunning ? (
            <div className="spinner"></div>
          ) : (
            <pre className="font-mono text-sm text-gray-300">{output || 'No output yet'}</pre>
          )}
          </div>
          <div className="p-4 border-t border-gray-800">
            <h3 className="text-sm font-semibold mb-2 text-gray-400">
              Custom Input:
            </h3>
            <textarea 
              className="w-full resize-none bg-gray-900 text-white border border-gray-700 rounded-md p-4 h-20 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter custom input"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
}