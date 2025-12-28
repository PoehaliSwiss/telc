

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export function UnsavedChangesModal({ isOpen, onSave, onDiscard, onCancel }: UnsavedChangesModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6 transform transition-all scale-100">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Unsaved Changes</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    You have unsaved changes in the current file. Do you want to save them before leaving?
                </p>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onSave}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Save & Continue
                    </button>
                    <button
                        onClick={onDiscard}
                        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                    >
                        Discard Changes
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
