import { useState } from 'react';
import { Header } from './components/Header';
import { ChatMessageList } from './components/ChatMessageList';
import { ChatInput } from './components/ChatInput';
import { DocumentDrawer } from './components/DocumentDrawer';
import { useChat } from './hooks/useChat';
import { useDocuments } from './hooks/useDocuments';

export function App() {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const { messages, isLoading, currentRoute, sendMessage, clearChat } = useChat();
  const {
    documents,
    isUploading,
    isDeleting,
    uploadError,
    totalChunksIndexed,
    uploadFile,
    removeDocument,
    removeAllDocuments,
    clearError,
  } = useDocuments();

  const handleSelectPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-primary">
      {/* Header with Health Badge & Knowledge Base Toggle */}
      <Header
        onOpenDocuments={() => setIsDrawerOpen(true)}
        documentCount={documents.length}
        onClearChat={clearChat}
        hasMessages={messages.length > 0}
      />

      {/* Main Conversation Stream */}
      <main className="flex-1 flex flex-col min-h-0">
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          currentRoute={currentRoute}
          onSelectPrompt={handleSelectPrompt}
        />

        {/* Input Area with upload shortcut */}
        <ChatInput
          onSendMessage={sendMessage}
          onOpenUpload={() => setIsDrawerOpen(true)}
          isLoading={isLoading}
        />
      </main>

      {/* Document Knowledge Base Slide-Over Drawer */}
      <DocumentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        documents={documents}
        isUploading={isUploading}
        isDeleting={isDeleting}
        uploadError={uploadError}
        onUploadFile={uploadFile}
        onRemoveDocument={removeDocument}
        onRemoveAllDocuments={removeAllDocuments}
        onClearError={clearError}
        totalChunksIndexed={totalChunksIndexed}
      />
    </div>
  );
}

export default App;
