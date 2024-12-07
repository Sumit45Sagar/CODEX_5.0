
import React, { useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
    const editorRef = useRef(null);

    // Define the custom theme before the editor mounts
    const handleEditorWillMount = (monaco) => {
        monaco.editor.defineTheme('custom-theme', {
            base: 'vs-dark', // Base theme (dark)
            inherit: true,
            rules: [
                { token: 'keyword', foreground: 'FF79C6' },
                { token: 'comment', foreground: '6272A4', fontStyle: 'italic' },
                { token: 'string', foreground: 'F1FA8C' },
                { token: 'number', foreground: 'BD93F9' },
                { token: 'identifier', foreground: '50FA7B' },
            ],
            colors: {
                'editor.background': '#282A36', // Background color
                'editor.foreground': '#F8F8F2', // Default text color
            },
        });
    };

    // Handle editor mounting and setup
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;

        // Set up listener for editor content changes
        editor.onDidChangeModelContent(() => {
            const code = editor.getValue();
            onCodeChange(code);
            if (socketRef?.current) {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                    roomId,
                    code,
                });
            }
        });

        // Apply the custom theme
        monaco.editor.setTheme('custom-theme');
    };

    // Listen to incoming socket events for code changes
    useEffect(() => {
        if (socketRef?.current) {
            const handleCodeChange = ({ code }) => {
                if (code !== null && editorRef.current) {
                    const currentCode = editorRef.current.getValue();
                    if (currentCode !== code) {
                        editorRef.current.setValue(code);
                    }
                }
            };

            socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);

            // Cleanup the listener on unmount
            return () => {
                socketRef.current.off(ACTIONS.CODE_CHANGE, handleCodeChange);
            };
        }
    }, [socketRef.current]);

    return (
        <MonacoEditor
            height="90vh"
            defaultLanguage="cpp" // Language for syntax highlighting
            beforeMount={handleEditorWillMount} // Define custom theme
            onMount={handleEditorDidMount} // Handle editor setup
            options={{
                fontSize: 14, // Font size
                minimap: { enabled: false }, // Disable minimap
                automaticLayout: true, // Automatically adjust layout
                wordWrap: 'on', // Wrap long lines
                scrollBeyondLastLine: false, // Prevent scrolling past the last line
            }}
        />
    );
};

export default Editor;

