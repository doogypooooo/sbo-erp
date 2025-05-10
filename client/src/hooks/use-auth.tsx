import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// 사용자 입력 스키마
const userLoginSchema = z.object({
  username: z.string().min(4, "아이디는 최소 4자 이상이어야 합니다."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다.")
});

const userRegisterSchema = z.object({
  username: z.string().min(4, "아이디는 최소 4자 이상이어야 합니다."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
  email: z.string().email("유효한 이메일 주소를 입력해주세요").optional().or(z.literal(''))
});

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  permissions: any[] | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
};

type LoginData = z.infer<typeof userLoginSchema>;
type RegisterData = z.infer<typeof userRegisterSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // 사용자 정보 조회
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // 사용자 권한 조회
  const { data: permissions } = useQuery({
    queryKey: ["/api/user/permissions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user, // 사용자가 로그인한 경우에만 조회
  });
  
  // 로그인 뮤테이션
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "로그인 성공",
        description: `${user.name}님 환영합니다.`,
      });
      console.log("로그인 성공! 사용자 데이터:", user);
    },
    onError: (error: Error) => {
      toast({
        title: "로그인 실패",
        description: error.message || "아이디 또는 비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
    },
  });

  // 회원가입 뮤테이션
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "회원가입 성공",
        description: `${user.name}님 환영합니다.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "회원가입 실패",
        description: error.message || "회원가입 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 로그아웃 뮤테이션
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/user/permissions"], null);
      toast({
        title: "로그아웃 되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "로그아웃 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        permissions: Array.isArray(permissions) ? permissions : null,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// 사용자 권한 확인 헬퍼 함수
export function usePermission(resource: string, action: 'read' | 'write' | 'delete' | 'export') {
  const { user, permissions } = useAuth();
  
  if (!user) return false;
  
  // 관리자는 모든 권한 보유
  if (user.role === 'admin') return true;
  
  if (!permissions) return false;
  
  const permission = permissions.find(p => p.resource === resource);
  if (!permission) return false;
  
  return (
    (action === 'read' && permission.canRead) ||
    (action === 'write' && permission.canWrite) ||
    (action === 'delete' && permission.canDelete) ||
    (action === 'export' && permission.canExport)
  );
}

export { userLoginSchema, userRegisterSchema };
