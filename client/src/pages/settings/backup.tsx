import React, { useEffect, useState } from "react";
import axios from "axios";

const UNITS = [
  { value: "minute", label: "분" },
  { value: "hour", label: "시간" },
  { value: "day", label: "일" },
  { value: "week", label: "주" },
];

export default function BackupSettingsPage() {
  const [backups, setBackups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [interval, setIntervalVal] = useState(10);
  const [unit, setUnit] = useState("minute");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/settings/backups");
      setBackups(res.data);
    } catch (err: any) {
      setError("백업 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleBackup = async () => {
    setBackupInProgress(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.post("/api/settings/backup");
      setSuccess("백업이 완료되었습니다.");
      fetchBackups();
    } catch (err: any) {
      setError("백업에 실패했습니다.");
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`/api/settings/backup/${filename}`);
      setSuccess("삭제되었습니다.");
      fetchBackups();
    } catch {
      setError("삭제에 실패했습니다.");
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/settings/backup/${filename}/download`, "_blank");
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setError(null);
    setSuccess(null);
    try {
      await axios.post("/api/settings/restore", { filename: restoreTarget });
      setSuccess("복원이 완료되었습니다. (서비스 재시작 필요할 수 있음)");
      setRestoreTarget(null);
      setConfirmRestore(false);
    } catch {
      setError("복원에 실패했습니다.");
    }
  };

  const handleScheduleSave = async () => {
    setSavingSchedule(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.post("/api/settings/backup-schedule", { interval, unit });
      setSuccess("백업 주기가 저장되었습니다.");
    } catch {
      setError("백업 주기 저장에 실패했습니다.");
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h3 className="text-xl font-semibold mb-6">데이터베이스 백업 관리</h3>
      <div className="mb-4 text-sm text-gray-600">최신 10개 백업만 보관됩니다. 복원 시 서비스가 재시작될 수 있습니다.</div>
      <div className="flex gap-2 mb-6">
        <button onClick={handleBackup} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow" disabled={backupInProgress}>
          {backupInProgress ? "백업 중..." : "즉시 백업"}
        </button>
      </div>
      <div className="mb-8">
        <h4 className="font-semibold mb-2">백업 파일 목록</h4>
        {loading ? (
          <div>불러오는 중...</div>
        ) : backups.length === 0 ? (
          <div className="text-gray-500">백업 파일이 없습니다.</div>
        ) : (
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-2">파일명</th>
                <th className="py-2 px-2">작업</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(filename => (
                <tr key={filename} className="border-t">
                  <td className="py-2 px-2 font-mono">{filename}</td>
                  <td className="py-2 px-2 flex gap-2">
                    <button onClick={() => { setRestoreTarget(filename); setConfirmRestore(true); }} className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded">복원</button>
                    <button onClick={() => handleDownload(filename)} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">다운로드</button>
                    <button onClick={() => handleDelete(filename)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="mb-8">
        <h4 className="font-semibold mb-2">백업 주기 설정</h4>
        <div className="flex items-center gap-2 mb-2">
          <input type="number" min={1} value={interval} onChange={e => setIntervalVal(Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
          <select value={unit} onChange={e => setUnit(e.target.value)} className="border rounded px-2 py-1">
            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
          <button onClick={handleScheduleSave} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded" disabled={savingSchedule}>
            {savingSchedule ? "저장 중..." : "저장"}
          </button>
        </div>
        <div className="text-xs text-gray-500">예: 10분, 1시간, 1일, 1주 등</div>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      {/* 복원 확인 다이얼로그 */}
      {confirmRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow p-8 max-w-sm w-full">
            <div className="font-bold mb-4">정말 이 백업 파일로 복원하시겠습니까?</div>
            <div className="mb-4 text-sm text-gray-600">복원 시 현재 데이터베이스가 덮어써지며, 서비스가 재시작될 수 있습니다.</div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmRestore(false)} className="px-4 py-2 rounded bg-gray-200">취소</button>
              <button onClick={handleRestore} className="px-4 py-2 rounded bg-yellow-500 text-white">복원</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 