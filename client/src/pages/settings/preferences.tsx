import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CompanySettingsPage from "./company";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function PreferencesPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Tabs defaultValue="company">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold">환경설정</h2>
              <TabsList>
                <TabsTrigger value="company">공급자(회사) 정보</TabsTrigger>
                {/* 추후 확장: <TabsTrigger value="theme">테마</TabsTrigger> 등 */}
              </TabsList>
            </div>
            <div className="max-w-2xl p-8 bg-white rounded shadow">
              <TabsContent value="company">
                <CompanySettingsPage />
              </TabsContent>
              {/* 추후 확장: <TabsContent value="theme">테마 설정 폼</TabsContent> 등 */}
            </div>
          </Tabs>
        </main>
        <Footer />
      </div>
    </div>
  );
} 