"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  guessColumnMapping,
  mapRowsToPolicies,
  parseCSV,
  POLICY_FIELDS,
  type PolicyField,
  type RowError,
} from "@/lib/csv";

type Step = "upload" | "map" | "summary";

interface ImportResult {
  imported: number;
  failed: RowError[];
  validationErrors: RowError[];
}

export default function ImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, PolicyField>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);

      if (parsed.headers.length === 0) {
        setFileError("Could not read the CSV file. Make sure it has a header row.");
        return;
      }

      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(guessColumnMapping(parsed.headers));
      setStep("map");
    };
    reader.onerror = () => setFileError("Failed to read the file.");
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function updateMapping(colIndex: number, field: PolicyField) {
    setMapping((prev) => ({ ...prev, [colIndex]: field }));
  }

  async function handleImport() {
    const { policies, errors: validationErrors } = mapRowsToPolicies(rows, mapping);

    if (policies.length === 0) {
      setResult({ imported: 0, failed: [], validationErrors });
      setStep("summary");
      return;
    }

    setImporting(true);
    const supabase = getSupabaseBrowser();
    const dbFailed: RowError[] = [];
    let imported = 0;

    for (let i = 0; i < policies.length; i++) {
      setProgress(`Importing ${i + 1} of ${policies.length}...`);
      const policy = policies[i];

      const { error } = await supabase.from("policies").insert(policy);

      if (error) {
        dbFailed.push({
          row: i + 2,
          client: policy.client_name,
          reason: error.message,
        });
      } else {
        imported++;
      }
    }

    setImporting(false);
    setProgress("");
    setResult({ imported, failed: dbFailed, validationErrors });
    setStep("summary");
  }

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setFileError(null);
  }

  if (step === "upload") {
    return (
      <div className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-navy-lighter rounded-xl p-10 text-center hover:border-accent/50 transition-colors"
        >
          <p className="text-gray-300 mb-2">Drop your AdaptAI CSV file here</p>
          <p className="text-gray-500 text-sm mb-4">or click to browse</p>
          <label className="inline-block px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg cursor-pointer transition-colors">
            Choose CSV File
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        </div>
        {fileError && (
          <p className="text-red-400 text-sm">{fileError}</p>
        )}
      </div>
    );
  }

  if (step === "map") {
    const previewRows = rows.slice(0, 5);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-gray-400 text-sm">
            {rows.length} rows found · {headers.length} columns
          </p>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Upload different file
          </button>
        </div>

        <div className="bg-navy-light border border-navy-lighter rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-lighter">
                {headers.map((header, i) => (
                  <th key={i} className="px-3 py-3 text-left align-top min-w-[140px]">
                    <p className="text-white font-medium mb-2 truncate">{header}</p>
                    <select
                      value={mapping[i] ?? "skip"}
                      onChange={(e) =>
                        updateMapping(i, e.target.value as PolicyField)
                      }
                      className="w-full px-2 py-1.5 bg-navy border border-navy-lighter rounded text-xs text-gray-300 focus:outline-none focus:border-accent"
                    >
                      {POLICY_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, ri) => (
                <tr key={ri} className="border-b border-navy-lighter/50">
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-2 text-gray-400 truncate max-w-[180px]">
                      {row[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">
          Showing first {previewRows.length} rows as preview
        </p>

        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {importing ? progress || "Importing..." : `Import ${rows.length} Records`}
        </button>
      </div>
    );
  }

  // summary step
  const totalFailed =
    (result?.failed.length ?? 0) + (result?.validationErrors.length ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-green-500/10 border border-green-500/40 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-green-400">{result?.imported ?? 0}</p>
          <p className="text-sm text-gray-400 mt-1">Imported</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-red-400">{totalFailed}</p>
          <p className="text-sm text-gray-400 mt-1">Failed</p>
        </div>
      </div>

      {totalFailed > 0 && (
        <div className="bg-navy-light border border-navy-lighter rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-navy-lighter">
            <h3 className="text-sm font-semibold text-white">Failed Records</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left">
                  <th className="px-4 py-2 font-medium">Row</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {[...(result?.validationErrors ?? []), ...(result?.failed ?? [])].map(
                  (err, i) => (
                    <tr key={i} className="border-t border-navy-lighter/50">
                      <td className="px-4 py-2 text-gray-400">{err.row}</td>
                      <td className="px-4 py-2 text-white">{err.client}</td>
                      <td className="px-4 py-2 text-red-300">{err.reason}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(result?.imported ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors text-center"
          >
            View Dashboard →
          </Link>
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 border border-navy-lighter text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}

      {(result?.imported ?? 0) === 0 && (
        <button
          type="button"
          onClick={reset}
          className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
        >
          Import Another File
        </button>
      )}
    </div>
  );
}
