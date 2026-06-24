import ImportWizard from "@/components/import/ImportWizard";

export default function ImportPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Import</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload an AdaptAI CSV export, map columns to your fields, and import
        </p>
      </div>

      <ImportWizard />
    </div>
  );
}
