import React, { useEffect, useState } from "react";
import axios from "axios";

interface CompanyInfo {
  businessNumber: string;
  name: string;
  contactName: string;
  address: string;
  type: string;
  category: string;
}

const defaultCompany: CompanyInfo = {
  businessNumber: "",
  name: "",
  contactName: "",
  address: "",
  type: "",
  category: ""
};

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<CompanyInfo>(defaultCompany);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get("/api/settings/company")
      .then((res: any) => {
        setCompany({ ...defaultCompany, ...res.data });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompany({ ...company, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await axios.put("/api/settings/company", company);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h3 className="text-xl font-semibold mb-6">공급자(회사) 정보 설정</h3>
      {loading ? (
        <div>불러오는 중...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block font-semibold mb-1">사업자등록번호</label>
              <input name="businessNumber" value={company.businessNumber} onChange={handleChange} className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-200" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">상호(회사명)</label>
              <input name="name" value={company.name} onChange={handleChange} className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-200" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">대표자명</label>
              <input name="contactName" value={company.contactName} onChange={handleChange} className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-200" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">주소</label>
              <input name="address" value={company.address} onChange={handleChange} className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-200" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">업태</label>
              <input name="type" value={company.type} onChange={handleChange} className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-200" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">종목</label>
              <input name="category" value={company.category} onChange={handleChange} className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-200" required />
            </div>
          </div>
          {error && <div className="text-red-600">{error}</div>}
          {success && <div className="text-green-600">저장되었습니다.</div>}
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow" disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
} 