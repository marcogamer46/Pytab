import React, { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { 
  Files, 
  Play, 
  Settings, 
  ChevronDown,
  X,
  Plus,
  Trash2,
  Download,
  FileCode,
  FileUp,
  Terminal as TerminalIcon,
  Sun,
  Moon,
  Type,
  Package,
  History as HistoryIcon,
  Maximize2,
  FolderOpen
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface FileItem {
  id: string;
  name: string;
  content: string;
  lastModified: number;
}

interface AppSettings {
  theme: 'vs-dark' | 'light';
  fontSize: number;
  uiFontSize: number;
  tabSize: number;
  autoSave: boolean;
  wordWrap: 'on' | 'off';
}

// --- Constants ---

const INITIAL_CODE = `print("Hello from Pytab!")
import sys
print(f"Python version: {sys.version}")

def greet(name):
    return f"Welcome, {name}!"

for i in range(3):
    print(f"Loop index: {i}")

print(greet("Tablet User"))
`;

// --- Main Component ---

export default function App() {
  // --- State: Files & Tabs ---
  const [files, setFiles] = useState<FileItem[]>(() => {
    const saved = localStorage.getItem('vspython_files');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'main.py', content: INITIAL_CODE, lastModified: Date.now() },
      { id: '2', name: 'utils.py', content: '# Utils', lastModified: Date.now() }
    ];
  });
  const [openFileIds, setOpenFileIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('vspython_open_tabs');
    return saved ? JSON.parse(saved) : ['1'];
  });
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return localStorage.getItem('vspython_active_tab') || '1';
  });

  // --- State: App ---
  const [output, setOutput] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'output' | 'problems' | 'terminal'>('output');
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [pipPackage, setPipPackage] = useState('');
  const [runArgs, setRunArgs] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPipOpen, setIsPipOpen] = useState(false);
  const [pipLog, setPipLog] = useState<string[]>([]);
  const [isPipInstalling, setIsPipInstalling] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>(['Python terminal ready. Enter expressions below.']);
  const [terminalInput, setTerminalInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressOpenAfterLongPressRef = useRef(false);

  // --- State: Settings ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('vspython_settings');
    return saved ? JSON.parse(saved) : {
      theme: 'vs-dark',
      fontSize: 16,
      uiFontSize: 14,
      tabSize: 4,
      autoSave: true,
      wordWrap: 'on'
    };
  });

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  // --- Effects: Persistence ---
  useEffect(() => {
    localStorage.setItem('vspython_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('vspython_open_tabs', JSON.stringify(openFileIds));
  }, [openFileIds]);

  useEffect(() => {
    localStorage.setItem('vspython_active_tab', activeFileId);
  }, [activeFileId]);

  useEffect(() => {
    localStorage.setItem('vspython_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    editorRef.current?.layout();
  }, [settings.fontSize]);

  // --- Effects: Pyodide ---
  useEffect(() => {
    async function initPyodide() {
      try {
        const py = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });
        await py.loadPackage("micropip");
        setPyodide(py);
        setOutput(["Python 3.x Environment Ready with micropip support."]);
      } catch (err) {
        setOutput(["Error loading Python: " + err]);
      }
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js";
    script.onload = initPyodide;
    document.head.appendChild(script);
  }, []);

  // --- Actions: File Management ---
  const addNewFile = () => {
    const id = Date.now().toString();
    const newFile = { id, name: `script_${files.length + 1}.py`, content: '# New Script', lastModified: Date.now() };
    setFiles([...files, newFile]);
    setOpenFileIds([...openFileIds, id]);
    setActiveFileId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenIds = openFileIds.filter(oid => oid !== id);
    setOpenFileIds(newOpenIds);
    if (activeFileId === id && newOpenIds.length > 0) {
      setActiveFileId(newOpenIds[newOpenIds.length - 1]);
    }
  };

  const openFile = (id: string) => {
    if (!openFileIds.includes(id)) {
      setOpenFileIds([...openFileIds, id]);
    }
    setActiveFileId(id);
  };

  const deleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length === 1) return;
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    setOpenFileIds(openFileIds.filter(oid => oid !== id));
    if (activeFileId === id) setActiveFileId(newFiles[0].id);
  };

  const renameFile = (id: string, newName: string) => {
    setFiles(files.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startRenameLongPress = (fileId: string) => {
    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      suppressOpenAfterLongPressRef.current = true;
      setRenamingFileId(fileId);
    }, 600);
  };

  const handleExplorerTap = (fileId: string) => {
    if (suppressOpenAfterLongPressRef.current) {
      suppressOpenAfterLongPressRef.current = false;
      return;
    }
    setRenamingFileId(null);
    openFile(fileId);
  };

  const handleCodeChange = (value: string | undefined) => {
    setFiles(files.map(f => f.id === activeFileId ? { ...f, content: value || '', lastModified: Date.now() } : f));
    if (settings.autoSave) {
      setLastSaved(Date.now());
    }
  };

  const openExternalFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const id = Date.now().toString();
      const newFile = { 
        id, 
        name: file.name, 
        content, 
        lastModified: Date.now() 
      };
      setFiles([...files, newFile]);
      setOpenFileIds([...openFileIds, id]);
      setActiveFileId(id);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const saveToSystem = async () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLastSaved(Date.now());
  };

  // --- Actions: Execution ---
  const runCode = async () => {
    if (!pyodide) return;
    setIsRunning(true);
    setOutput([]);
    
    try {
      const argsArray = runArgs.split(' ').filter(a => a);
      pyodide.runPython(`
import sys
import io
sys.argv = ['${activeFile.name}'] + ${JSON.stringify(argsArray)}
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
      `);

      await pyodide.runPythonAsync(activeFile.content);
      
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");
      
      if (stdout) setOutput(prev => [...prev, ...stdout.split('\n').filter((l: string) => l)]);
      if (stderr) setOutput(prev => [...prev, "ERROR: " + stderr]);
      if (!stdout && !stderr) setOutput(["(Program finished with no output)"]);
    } catch (err: any) {
      setOutput(prev => [...prev, "RUNTIME ERROR: " + err.message]);
    } finally {
      setIsRunning(false);
    }
  };

  const installPackage = async () => {
    const pkg = pipPackage.trim();
    if (!pyodide || !pkg || isPipInstalling) return;
    setIsPipInstalling(true);
    setPipLog(prev => [...prev, `Installing ${pkg}...`]);
    setPipPackage('');
    try {
      const micropip = pyodide.pyimport("micropip");
      await micropip.install(pkg);
      setPipLog(prev => [...prev, `Successfully installed ${pkg}`]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setPipLog(prev => [...prev, `ERROR: ${message}`]);
    } finally {
      setIsPipInstalling(false);
    }
  };

  const exportFile = () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const editorLineHeight = Math.round(settings.fontSize * 1.5);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    requestAnimationFrame(() => editor.layout());
  };

  const problems = output.filter(
    line =>
      line.startsWith('ERROR') ||
      line.startsWith('RUNTIME') ||
      line.startsWith('PIP ERROR')
  );

  const runTerminalCommand = async () => {
    if (!pyodide || !terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalLines(prev => [...prev, `>>> ${cmd}`]);
    setTerminalInput('');
    try {
      const result = await pyodide.runPythonAsync(cmd);
      if (result !== undefined && result !== null) {
        setTerminalLines(prev => [...prev, String(result)]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setTerminalLines(prev => [...prev, message]);
    }
  };

  const bottomTabClass = (tab: 'output' | 'problems' | 'terminal') =>
    cn(
      'h-full px-1 transition-opacity',
      activeBottomTab === tab
        ? 'text-[#007acc] border-b-2 border-[#007acc]'
        : 'opacity-40'
    );

  // --- Render Helpers ---

  const themeColors = settings.theme === 'vs-dark' ? {
    bg: 'bg-[#1e1e1e]',
    sidebar: 'bg-[#252526]',
    activity: 'bg-[#333333]',
    border: 'border-[#2b2b2b]',
    text: 'text-[#cccccc]',
    textActive: 'text-white',
    tab: 'bg-[#1e1e1e]',
    tabInactive: 'bg-[#252526]',
  } : {
    bg: 'bg-white',
    sidebar: 'bg-[#f3f3f3]',
    activity: 'bg-[#2c2c2c]',
    border: 'border-[#e5e5e5]',
    text: 'text-[#333333]',
    textActive: 'text-black',
    tab: 'bg-white',
    tabInactive: 'bg-[#ececec]',
  };

  return (
    <div 
      className={cn("flex h-screen w-screen overflow-hidden font-sans select-none", themeColors.bg, themeColors.text)}
      style={{ fontSize: `${settings.uiFontSize}px` }}
    >
      
      {/* Activity Bar */}
      <div className={cn("w-12 flex flex-col items-center py-4 space-y-6 border-r", themeColors.activity, themeColors.border)}>
        <div className="mb-2">
          <img src="logo.png" alt="Pytab Logo" className="w-8 h-8 rounded-md shadow-sm" />
        </div>
        <Files 
          className={cn("w-6 h-6 cursor-pointer transition-opacity text-white", isSidebarOpen ? "opacity-100" : "opacity-40")} 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <Package 
          className={cn(
            "w-6 h-6 cursor-pointer text-white",
            isPipOpen ? "opacity-100" : "opacity-40"
          )}
          onClick={() => setIsPipOpen(true)} 
        />
        <HistoryIcon 
          className="w-6 h-6 opacity-40 cursor-pointer text-white"
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
        />
        <div className="flex-grow" />
        <Settings 
          className="w-6 h-6 opacity-40 cursor-pointer text-white" 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        />
      </div>

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className={cn("w-64 flex flex-col border-r", themeColors.sidebar, themeColors.border)}>
          <div className="flex-grow overflow-y-auto">
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Explorer</span>
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 opacity-60 cursor-pointer" onClick={addNewFile} />
                <FolderOpen className="w-4 h-4 opacity-60 cursor-pointer" onClick={openExternalFile} />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".py,.txt,.json" 
              onChange={handleFileImport} 
            />
            <div className="flex items-center px-4 py-1 bg-[#37373d]/20 text-[12px] cursor-default mb-1">
              <ChevronDown className="w-3 h-3 mr-1" />
              <span className="font-semibold">WORKSPACE</span>
            </div>
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => handleExplorerTap(file.id)}
                onPointerDown={(e) => {
                  if (renamingFileId === file.id || e.button !== 0) return;
                  startRenameLongPress(file.id);
                }}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                className={cn(
                  "flex items-center px-6 py-1 text-[13px] cursor-pointer touch-manipulation",
                  activeFileId === file.id ? "bg-[#37373d] text-white" : ""
                )}
              >
                <FileCode className="w-3.5 h-3.5 mr-2 text-blue-400 shrink-0 pointer-events-none" />
                {renamingFileId === file.id ? (
                  <input
                    autoFocus
                    className="bg-transparent border border-[#007acc] outline-none truncate flex-grow text-[13px] px-1 rounded"
                    value={file.name}
                    onChange={(e) => renameFile(file.id, e.target.value)}
                    onBlur={() => setRenamingFileId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') setRenamingFileId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate flex-grow pointer-events-none">{file.name}</span>
                )}
                <X 
                  className="w-3 h-3 opacity-50 ml-2 shrink-0 p-1" 
                  onClick={(e) => deleteFile(file.id, e)}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </div>
            ))}

            <div className="mt-4 px-4 py-2">
              <div className="text-[11px] font-bold uppercase opacity-60 mb-2">Run Arguments</div>
              <input 
                className="w-full bg-[#1e1e1e] border border-[#2b2b2b] text-[12px] px-2 py-1 rounded outline-none focus:border-[#007acc]"
                placeholder="arg1 arg2 ..."
                value={runArgs}
                onChange={(e) => setRunArgs(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-grow flex flex-col min-w-0 relative">
        <div className={cn("h-9 flex items-center border-b overflow-x-auto no-scrollbar", themeColors.sidebar, themeColors.border)}>
          {openFileIds.map(id => {
            const file = files.find(f => f.id === id);
            if (!file) return null;
            return (
              <div 
                key={id}
                role="tab"
                aria-selected={activeFileId === id}
                onClick={() => {
                  setRenamingFileId(null);
                  openFile(id);
                  editorRef.current?.focus();
                }}
                className={cn(
                  "flex items-center h-full px-4 border-r cursor-pointer min-w-[120px] max-w-[200px] transition-colors touch-manipulation",
                  activeFileId === id ? cn(themeColors.tab, "border-t-2 border-t-[#007acc]") : themeColors.tabInactive,
                  themeColors.border
                )}
              >
                <FileCode className="w-3.5 h-3.5 mr-2 text-blue-400 shrink-0 pointer-events-none" />
                <span className={cn("text-[12px] truncate flex-grow pointer-events-none", activeFileId === id ? "text-white" : "opacity-60")}>
                  {file.name}
                </span>
                <X 
                  className="w-3 h-3 ml-2 opacity-50 rounded shrink-0 p-1" 
                  onClick={(e) => closeTab(id, e)}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </div>
            );
          })}
          
          <div className="ml-auto flex items-center px-4 space-x-4">
             <button 
              onClick={runCode}
              disabled={isRunning || !pyodide}
              className="flex items-center space-x-1 text-green-500 disabled:opacity-30 active:scale-95"
             >
               <Play className="w-4 h-4 fill-current" />
               <span className="text-[11px] font-bold uppercase tracking-wider">Run</span>
             </button>
             <div className="w-[1px] h-4 bg-[#2b2b2b]" />
             <button onClick={saveToSystem} className="opacity-60">
               <FileUp className="w-4 h-4" />
             </button>
             <button onClick={exportFile} className="opacity-60">
               <Download className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="flex-grow flex flex-col relative">
          <div
            className="flex-grow monaco-editor-container"
            style={{
              fontSize: settings.fontSize,
              ['--vscode-editor-line-height' as string]: `${editorLineHeight}px`,
            }}
          >
            <Editor
              height="100%"
              language="python"
              theme={settings.theme}
              value={activeFile.content}
              onMount={handleEditorDidMount}
              onChange={handleCodeChange}
              options={{
                fontSize: settings.fontSize,
                tabSize: settings.tabSize,
                wordWrap: settings.wordWrap,
                fontFamily: "Consolas, 'Courier New', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                lineHeight: editorLineHeight,
                renderLineHighlight: 'all',
                suggestOnTriggerCharacters: false,
                quickSuggestions: false,
                wordBasedSuggestions: 'off',
                snippetSuggestions: 'none',
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  useShadows: false,
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10
                }
              }}
            />
          </div>
        </div>

        {isBottomPanelOpen && (
          <div className={cn("h-1/3 border-t flex flex-col", themeColors.bg, themeColors.border)}>
            <div className={cn("h-8 px-4 flex items-center justify-between border-b", themeColors.border)}>
              <div className="flex space-x-6 text-[11px] font-bold uppercase tracking-wider h-full">
                <button type="button" className={bottomTabClass('output')} onClick={() => setActiveBottomTab('output')}>
                  Output
                </button>
                <button type="button" className={bottomTabClass('problems')} onClick={() => setActiveBottomTab('problems')}>
                  Problems
                </button>
                <button type="button" className={bottomTabClass('terminal')} onClick={() => setActiveBottomTab('terminal')}>
                  Terminal
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <Trash2 
                  className="w-3.5 h-3.5 opacity-50 cursor-pointer" 
                  onClick={() => {
                    if (activeBottomTab === 'output') setOutput([]);
                    else if (activeBottomTab === 'terminal') setTerminalLines(['Python terminal ready. Enter expressions below.']);
                  }}
                />
                <X
                  className="w-3.5 h-3.5 opacity-50 cursor-pointer"
                  onClick={() => setIsBottomPanelOpen(false)}
                />
              </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4 font-mono text-[13px] leading-relaxed selection:bg-[#007acc]/30 flex flex-col min-h-0">
              {activeBottomTab === 'output' && (
                <>
                  {output.length === 0 ? (
                    <div className="opacity-20 italic">No output yet. Run a script to see results.</div>
                  ) : (
                    output.map((line, i) => (
                      <div key={i} className={cn(
                        "whitespace-pre-wrap mb-0.5",
                        line.startsWith("ERROR") || line.startsWith("PIP ERROR") ? "text-red-400" : 
                        line.startsWith("RUNTIME") ? "text-red-500 font-bold" : 
                        line.startsWith("Successfully") ? "text-green-400" : "opacity-80"
                      )}>
                        {line}
                      </div>
                    ))
                  )}
                  {isRunning && (
                    <div className="flex items-center text-[#007acc] mt-2 font-bold animate-pulse">
                      <TerminalIcon className="w-4 h-4 mr-2" />
                      <span>Executing Python script...</span>
                    </div>
                  )}
                </>
              )}
              {activeBottomTab === 'problems' && (
                problems.length === 0 ? (
                  <div className="opacity-20 italic">No problems detected.</div>
                ) : (
                  problems.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap mb-1 text-red-400 flex items-start">
                      <span className="mr-2 opacity-60 shrink-0">✕</span>
                      <span>{line}</span>
                    </div>
                  ))
                )
              )}
              {activeBottomTab === 'terminal' && (
                <>
                  <div className="flex-grow overflow-y-auto">
                    {terminalLines.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap mb-0.5 opacity-80">
                        {line}
                      </div>
                    ))}
                  </div>
                  <form
                    className="flex items-center border-t border-[#2b2b2b] pt-2 mt-2 shrink-0"
                    onSubmit={(e) => {
                      e.preventDefault();
                      runTerminalCommand();
                    }}
                  >
                    <span className="text-[#007acc] mr-2 shrink-0">&gt;&gt;&gt;</span>
                    <input
                      className="flex-grow bg-transparent border-none outline-none text-[13px] font-mono"
                      placeholder="Enter Python expression..."
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      disabled={!pyodide}
                    />
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {isPipOpen && (
          <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className={cn("w-full max-w-lg rounded-xl shadow-2xl border flex flex-col max-h-[85vh]", themeColors.sidebar, themeColors.border)}>
              <div className="flex justify-between items-center p-6 pb-4 border-b border-[#2b2b2b]">
                <h2 className="text-lg font-bold flex items-center">
                  <Package className="w-5 h-5 mr-2 text-[#007acc]" /> Pip Installer
                </h2>
                <X className="w-5 h-5 cursor-pointer opacity-60" onClick={() => setIsPipOpen(false)} />
              </div>

              <div className="px-6 py-4 space-y-4 flex flex-col min-h-0 flex-grow">
                <p className="text-[12px] opacity-60 leading-relaxed">
                  Install Python packages with micropip. Only packages built for Pyodide are supported
                  (e.g. numpy, pandas, micropip).
                </p>

                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    installPackage();
                  }}
                >
                  <input
                    className="flex-grow bg-[#1e1e1e] border border-[#2b2b2b] text-[13px] px-3 py-2 rounded outline-none focus:border-[#007acc] text-white"
                    placeholder="Package name, e.g. numpy"
                    value={pipPackage}
                    onChange={(e) => setPipPackage(e.target.value)}
                    disabled={!pyodide || isPipInstalling}
                  />
                  <button
                    type="submit"
                    disabled={!pyodide || isPipInstalling || !pipPackage.trim()}
                    className="bg-[#007acc] text-white px-4 py-2 rounded font-bold text-[13px] disabled:opacity-40 shrink-0"
                  >
                    {isPipInstalling ? 'Installing…' : 'Install'}
                  </button>
                </form>

                {!pyodide && (
                  <p className="text-[12px] text-amber-400">Loading Python environment…</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase opacity-60 tracking-wider">Install log</span>
                  <button
                    type="button"
                    className="text-[11px] opacity-60"
                    onClick={() => setPipLog([])}
                    disabled={pipLog.length === 0}
                  >
                    Clear log
                  </button>
                </div>

                <div className="flex-grow min-h-[160px] max-h-[240px] overflow-y-auto rounded border border-[#2b2b2b] bg-[#1e1e1e] p-3 font-mono text-[12px] leading-relaxed">
                  {pipLog.length === 0 ? (
                    <span className="opacity-30 italic">No installs yet.</span>
                  ) : (
                    pipLog.map((line, i) => (
                      <div
                        key={i}
                        className={cn(
                          'whitespace-pre-wrap mb-1',
                          line.startsWith('ERROR') ? 'text-red-400' : line.startsWith('Successfully') ? 'text-green-400' : 'opacity-80'
                        )}
                      >
                        {line}
                      </div>
                    ))
                  )}
                  {isPipInstalling && (
                    <div className="text-[#007acc] mt-2 animate-pulse">Working…</div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  type="button"
                  className="w-full bg-[#007acc] text-white py-2 rounded-lg font-bold"
                  onClick={() => setIsPipOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {isSettingsOpen && (
          <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className={cn("w-full max-w-md rounded-xl shadow-2xl border p-6 animate-in fade-in zoom-in duration-200", themeColors.sidebar, themeColors.border)}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center">
                  <Settings className="w-5 h-5 mr-2" /> Settings
                </h2>
                <X className="w-5 h-5 cursor-pointer opacity-60" onClick={() => setIsSettingsOpen(false)} />
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {settings.theme === 'vs-dark' ? <Moon className="w-4 h-4 mr-3" /> : <Sun className="w-4 h-4 mr-3" />}
                    <span>Theme</span>
                  </div>
                  <select 
                    className="bg-[#1e1e1e] border border-[#2b2b2b] rounded px-2 py-1 text-sm outline-none text-white"
                    value={settings.theme}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value as any })}
                  >
                    <option value="vs-dark">VS Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Type className="w-4 h-4 mr-3" />
                    <span>Editor Font Size</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="range" min="10" max="40" 
                      value={settings.fontSize} 
                      onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                      className="w-24 accent-[#007acc]"
                    />
                    <span className="w-6 text-sm">{settings.fontSize}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Maximize2 className="w-4 h-4 mr-3" />
                    <span>UI Font Size</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="range" min="10" max="24" 
                      value={settings.uiFontSize} 
                      onChange={(e) => setSettings({ ...settings, uiFontSize: parseInt(e.target.value) })}
                      className="w-24 accent-[#007acc]"
                    />
                    <span className="w-6 text-sm">{settings.uiFontSize}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span>Tab Size</span>
                  <select 
                    className="bg-[#1e1e1e] border border-[#2b2b2b] rounded px-2 py-1 text-sm outline-none text-white"
                    value={settings.tabSize}
                    onChange={(e) => setSettings({ ...settings, tabSize: parseInt(e.target.value) })}
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span>Word Wrap</span>
                  <button 
                    className={cn(
                      "px-3 py-1 rounded text-xs font-bold transition-colors text-white",
                      settings.wordWrap === 'on' ? "bg-[#007acc]" : "bg-[#333333]"
                    )}
                    onClick={() => setSettings({ ...settings, wordWrap: settings.wordWrap === 'on' ? 'off' : 'on' })}
                  >
                    {settings.wordWrap.toUpperCase()}
                  </button>
                </div>
              </div>

              <button 
                className="w-full mt-8 bg-[#007acc] text-white py-2 rounded-lg font-bold"
                onClick={() => setIsSettingsOpen(false)}
              >
                Close Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
