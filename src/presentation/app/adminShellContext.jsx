import { createContext, useContext } from "react";

export const AdminShellContext = createContext({
  signOut: async () => {},
});

export function useAdminShell() {
  return useContext(AdminShellContext);
}
