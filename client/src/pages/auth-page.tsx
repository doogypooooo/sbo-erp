import { z } from "zod";
import { useState, useEffect } from "react";
import { useAuth, userLoginSchema, userRegisterSchema } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");

  // 이미 로그인되어 있으면 대시보드로 리디렉션
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // 로그인 폼
  const loginForm = useForm<z.infer<typeof userLoginSchema>>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const handleLogin = (data: z.infer<typeof userLoginSchema>) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        console.log("로그인 성공, 리디렉션 시도");
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      }
    });
  };

  // 회원가입 폼
  const registerForm = useForm<z.infer<typeof userRegisterSchema>>({
    resolver: zodResolver(userRegisterSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: ""
    }
  });

  const handleRegister = (data: z.infer<typeof userRegisterSchema>) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        console.log("회원가입 성공, 리디렉션 시도");
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 왼쪽 폼 영역 */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-bold">SBO-ERP</CardTitle>
            <CardDescription className="text-center">
              소상공인을 위한 맞춤형 회계/재무 관리 시스템
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="register">회원가입</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>아이디</FormLabel>
                          <FormControl>
                            <Input placeholder="아이디를 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>비밀번호</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="비밀번호를 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full mt-6" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      로그인
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>아이디</FormLabel>
                          <FormControl>
                            <Input placeholder="아이디를 입력하세요 (최소 4자)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>비밀번호</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="비밀번호를 입력하세요 (최소 6자)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이름</FormLabel>
                          <FormControl>
                            <Input placeholder="이름을 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이메일 (선택)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="이메일을 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full mt-6" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      회원가입
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* 오른쪽 설명 영역 */}
        <div className="hidden md:flex flex-col justify-center p-6 bg-primary text-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-6">SBO-ERP</h1>
          <h2 className="text-xl font-semibold mb-4">소상공인을 위한 맞춤형 회계/재무 관리 시스템</h2>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2">
              <i className="mdi mdi-check-circle"></i>
              <span>간편한 재고 관리 (바코드 스캔 기능)</span>
            </li>
            <li className="flex items-center gap-2">
              <i className="mdi mdi-check-circle"></i>
              <span>편리한 회계 및 재무 관리</span>
            </li>
            <li className="flex items-center gap-2">
              <i className="mdi mdi-check-circle"></i>
              <span>거래처/품목 통합 관리</span>
            </li>
            <li className="flex items-center gap-2">
              <i className="mdi mdi-check-circle"></i>
              <span>세금계산서 관리</span>
            </li>
            <li className="flex items-center gap-2">
              <i className="mdi mdi-check-circle"></i>
              <span>다양한 보고서 및 통계</span>
            </li>
          </ul>
          <p className="text-sm opacity-80">
            SBO-ERP는 소상공인의 업무 효율성을 극대화할 수 있는 통합 관리 솔루션입니다. 
            회원가입 후 모든 기능을 무료로 사용해보세요.
          </p>
        </div>
      </div>
    </div>
  );
}
