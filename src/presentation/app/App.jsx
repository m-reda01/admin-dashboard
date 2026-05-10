import React, { useEffect, useMemo, useState } from "react";
import { SendPasswordResetUseCase } from "../../application/auth/sendPasswordResetUseCase.js";
import { SignOutUseCase } from "../../application/auth/signOutUseCase.js";
import { SignInUseCase } from "../../application/auth/signInUseCase.js";
import { CreateAdminUseCase } from "../../application/admins/createAdminUseCase.js";
import { DeleteAdminUseCase } from "../../application/admins/deleteAdminUseCase.js";
import { ListAdminsUseCase } from "../../application/admins/listAdminsUseCase.js";
import { UpdateAdminUseCase } from "../../application/admins/updateAdminUseCase.js";
import { DeleteDocumentUseCase } from "../../application/documents/deleteDocumentUseCase.js";
import { ListDocumentsUseCase } from "../../application/documents/listDocumentsUseCase.js";
import { ListOrganizationDocumentsUseCase } from "../../application/documents/listOrganizationDocumentsUseCase.js";
import { GetOrganizationUseCase } from "../../application/organizations/getOrganizationUseCase.js";
import { UpdateOrganizationUseCase } from "../../application/organizations/updateOrganizationUseCase.js";
import { ListOrganizationMembersUseCase } from "../../application/organizations/listOrganizationMembersUseCase.js";
import { ListOrganizationSubscriptionsUseCase } from "../../application/organizations/listOrganizationSubscriptionsUseCase.js";
import { ListOrganizationsUseCase } from "../../application/organizations/listOrganizationsUseCase.js";
import { CreateSubscriptionPlanUseCase } from "../../application/subscriptionPlans/createSubscriptionPlanUseCase.js";
import { DeleteSubscriptionPlanUseCase } from "../../application/subscriptionPlans/deleteSubscriptionPlanUseCase.js";
import { ListSubscriptionPlansUseCase } from "../../application/subscriptionPlans/listSubscriptionPlansUseCase.js";
import { UpdateSubscriptionPlanUseCase } from "../../application/subscriptionPlans/updateSubscriptionPlanUseCase.js";
import { GetAdminDashboardOverviewUseCase } from "../../application/dashboard/getAdminDashboardOverviewUseCase.js";
import { DeletePaymentUseCase } from "../../application/payments/deletePaymentUseCase.js";
import { ListPaymentsUseCase } from "../../application/payments/listPaymentsUseCase.js";
import { ListComplaintsByUserIdUseCase } from "../../application/complaints/listComplaintsByUserIdUseCase.js";
import { ListComplaintsUseCase } from "../../application/complaints/listComplaintsUseCase.js";
import { UpdateComplaintStatusUseCase } from "../../application/complaints/updateComplaintStatusUseCase.js";
import { DeleteUserUseCase } from "../../application/users/deleteUserUseCase.js";
import { GetUserProfileUseCase } from "../../application/users/getUserProfileUseCase.js";
import { ListUsersUseCase } from "../../application/users/listUsersUseCase.js";
import { UpdateUserUseCase } from "../../application/users/updateUserUseCase.js";
import { FirebaseAdminDashboardRepository } from "../../infrastructure/admin/firebaseAdminDashboardRepository.js";
import { FirebaseAdminsRepository } from "../../infrastructure/admins/firebaseAdminsRepository.js";
import { FirebaseAuthRepository } from "../../infrastructure/auth/firebaseAuthRepository.js";
import { FirebaseComplaintsRepository } from "../../infrastructure/complaints/firebaseComplaintsRepository.js";
import { FirebaseDocumentsRepository } from "../../infrastructure/documents/firebaseDocumentsRepository.js";
import { FirebaseOrganizationsRepository } from "../../infrastructure/organizations/firebaseOrganizationsRepository.js";
import { FirebasePaymentsRepository } from "../../infrastructure/payments/firebasePaymentsRepository.js";
import { FirebaseSubscriptionPlansRepository } from "../../infrastructure/subscriptionPlans/firebaseSubscriptionPlansRepository.js";
import { FirebaseUsersRepository } from "../../infrastructure/users/firebaseUsersRepository.js";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage.jsx";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { AdminsManagementPage } from "../pages/AdminsManagementPage.jsx";
import { BillingPage } from "../pages/BillingPage.jsx";
import { ComplaintsManagementPage } from "../pages/ComplaintsManagementPage.jsx";
import { PlansManagementPage } from "../pages/PlansManagementPage.jsx";
import { DocumentsManagementPage } from "../pages/DocumentsManagementPage.jsx";
import { HomePage } from "../pages/HomePage.jsx";
import { OrganizationDetailsPage } from "../pages/OrganizationDetailsPage.jsx";
import { OrganizationsManagementPage } from "../pages/OrganizationsManagementPage.jsx";
import { UserDetailsPage } from "../pages/UserDetailsPage.jsx";
import { UsersManagementPage } from "../pages/UsersManagementPage.jsx";
import { SettingsPage } from "../pages/SettingsPage.jsx";
import { AdminShellContext } from "./adminShellContext.jsx";

export function App() {
  const authRepository = useMemo(() => new FirebaseAuthRepository(), []);
  const organizationsRepository = useMemo(() => new FirebaseOrganizationsRepository(), []);
  const usersRepository = useMemo(() => new FirebaseUsersRepository(), []);
  const documentsRepository = useMemo(() => new FirebaseDocumentsRepository(), []);
  const paymentsRepository = useMemo(() => new FirebasePaymentsRepository(), []);
  const subscriptionPlansRepository = useMemo(() => new FirebaseSubscriptionPlansRepository(), []);
  const complaintsRepository = useMemo(() => new FirebaseComplaintsRepository(), []);
  const adminDashboardRepository = useMemo(() => new FirebaseAdminDashboardRepository(), []);
  const adminsRepository = useMemo(() => new FirebaseAdminsRepository(), []);
  const signInUseCase = useMemo(() => new SignInUseCase({ authRepository }), [authRepository]);
  const signOutUseCase = useMemo(() => new SignOutUseCase({ authRepository }), [authRepository]);
  const listUsersUseCase = useMemo(
    () => new ListUsersUseCase({ usersRepository }),
    [usersRepository],
  );
  const listOrganizationsUseCase = useMemo(
    () => new ListOrganizationsUseCase({ organizationsRepository }),
    [organizationsRepository],
  );
  const getOrganizationUseCase = useMemo(
    () => new GetOrganizationUseCase({ organizationsRepository }),
    [organizationsRepository],
  );
  const updateOrganizationUseCase = useMemo(
    () => new UpdateOrganizationUseCase({ organizationsRepository }),
    [organizationsRepository],
  );
  const listOrganizationMembersUseCase = useMemo(
    () => new ListOrganizationMembersUseCase({ organizationsRepository }),
    [organizationsRepository],
  );
  const listOrganizationSubscriptionsUseCase = useMemo(
    () => new ListOrganizationSubscriptionsUseCase({ organizationsRepository }),
    [organizationsRepository],
  );
  const listOrganizationDocumentsUseCase = useMemo(
    () => new ListOrganizationDocumentsUseCase({ documentsRepository }),
    [documentsRepository],
  );
  const getUserProfileUseCase = useMemo(
    () => new GetUserProfileUseCase({ usersRepository }),
    [usersRepository],
  );
  const deleteUserUseCase = useMemo(
    () => new DeleteUserUseCase({ usersRepository }),
    [usersRepository],
  );
  const updateUserUseCase = useMemo(
    () => new UpdateUserUseCase({ usersRepository }),
    [usersRepository],
  );
  const sendPasswordResetUseCase = useMemo(
    () => new SendPasswordResetUseCase({ authRepository }),
    [authRepository],
  );
  const listDocumentsUseCase = useMemo(() => new ListDocumentsUseCase({ documentsRepository }), [documentsRepository]);
  const deleteDocumentUseCase = useMemo(() => new DeleteDocumentUseCase({ documentsRepository }), [documentsRepository]);
  const listPaymentsUseCase = useMemo(() => new ListPaymentsUseCase({ paymentsRepository }), [paymentsRepository]);
  const listComplaintsByUserIdUseCase = useMemo(
    () => new ListComplaintsByUserIdUseCase({ complaintsRepository }),
    [complaintsRepository],
  );
  const listComplaintsUseCase = useMemo(
    () => new ListComplaintsUseCase({ complaintsRepository }),
    [complaintsRepository],
  );
  const updateComplaintStatusUseCase = useMemo(
    () => new UpdateComplaintStatusUseCase({ complaintsRepository }),
    [complaintsRepository],
  );
  const deletePaymentUseCase = useMemo(() => new DeletePaymentUseCase({ paymentsRepository }), [paymentsRepository]);
  const listSubscriptionPlansUseCase = useMemo(
    () => new ListSubscriptionPlansUseCase({ subscriptionPlansRepository }),
    [subscriptionPlansRepository],
  );
  const createSubscriptionPlanUseCase = useMemo(
    () => new CreateSubscriptionPlanUseCase({ subscriptionPlansRepository }),
    [subscriptionPlansRepository],
  );
  const updateSubscriptionPlanUseCase = useMemo(
    () => new UpdateSubscriptionPlanUseCase({ subscriptionPlansRepository }),
    [subscriptionPlansRepository],
  );
  const deleteSubscriptionPlanUseCase = useMemo(
    () => new DeleteSubscriptionPlanUseCase({ subscriptionPlansRepository }),
    [subscriptionPlansRepository],
  );
  const listAdminsUseCase = useMemo(() => new ListAdminsUseCase({ adminsRepository }), [adminsRepository]);
  const createAdminUseCase = useMemo(() => new CreateAdminUseCase({ adminsRepository }), [adminsRepository]);
  const updateAdminUseCase = useMemo(() => new UpdateAdminUseCase({ adminsRepository }), [adminsRepository]);
  const deleteAdminUseCase = useMemo(() => new DeleteAdminUseCase({ adminsRepository }), [adminsRepository]);
  const getAdminDashboardOverviewUseCase = useMemo(
    () =>
      new GetAdminDashboardOverviewUseCase({
        adminDashboardRepository,
        subscriptionPlansRepository,
        usersRepository,
        organizationsRepository,
        documentsRepository,
        paymentsRepository,
        complaintsRepository,
      }),
    [
      adminDashboardRepository,
      subscriptionPlansRepository,
      usersRepository,
      organizationsRepository,
      documentsRepository,
      paymentsRepository,
      complaintsRepository,
    ],
  );
  const [appRoute, setAppRoute] = useState(() => getAppRoute());
  const [session, setSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(null, "", "/login");
      setAppRoute("login");
    }

    function handlePopState() {
      setAppRoute(getAppRoute());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const unsubscribe = authRepository.subscribeToSession(
      (nextSession) => {
        setSession(nextSession);
        setIsCheckingSession(false);

        const route = getAppRoute();
        if (
          nextSession &&
          route !== "dashboard" &&
          route !== "users" &&
          route !== "user-details" &&
          route !== "organizations" &&
          route !== "organization-details" &&
          route !== "documents" &&
          route !== "billing" &&
          route !== "billing-plans" &&
          route !== "complaints" &&
          route !== "admins" &&
          route !== "settings"
        ) {
          replaceRoute("/dashboard");
          return;
        }

        if (
          !nextSession &&
          (route === "dashboard" ||
            route === "users" ||
            route === "user-details" ||
            route === "organizations" ||
            route === "organization-details" ||
            route === "documents" ||
            route === "billing" ||
            route === "billing-plans" ||
            route === "complaints" ||
            route === "admins" ||
            route === "settings")
        ) {
          replaceRoute("/login");
        }
      },
      () => {
        setIsCheckingSession(false);
      },
    );

    return unsubscribe;
  }, [authRepository]);

  function navigateRoute(path) {
    window.history.pushState(null, "", path);
    setAppRoute(getAppRoute());
  }

  function replaceRoute(path) {
    window.history.replaceState(null, "", path);
    setAppRoute(getAppRoute());
  }

  async function handleSignedIn(nextSession) {
    setSession(nextSession);
    replaceRoute("/dashboard");
  }

  async function handleSignOut() {
    await signOutUseCase.execute();
    setSession(null);
    replaceRoute("/login");
  }

  let content;

  if (isCheckingSession) {
    content = (
      <main className="app-loading">
        <span className="button-spinner" aria-hidden="true" />
      </main>
    );
  } else if (appRoute === "dashboard" && session) {
    content = (
      <HomePage
        getAdminDashboardOverviewUseCase={getAdminDashboardOverviewUseCase}
        session={session}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "users" && session) {
    content = (
      <UsersManagementPage
        deleteUserUseCase={deleteUserUseCase}
        listUsersUseCase={listUsersUseCase}
        session={session}
        updateUserUseCase={updateUserUseCase}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "organization-details" && session) {
    content = (
      <OrganizationDetailsPage
        getOrganizationUseCase={getOrganizationUseCase}
        getUserProfileUseCase={getUserProfileUseCase}
        listOrganizationDocumentsUseCase={listOrganizationDocumentsUseCase}
        listOrganizationMembersUseCase={listOrganizationMembersUseCase}
        listOrganizationSubscriptionsUseCase={listOrganizationSubscriptionsUseCase}
        listPaymentsUseCase={listPaymentsUseCase}
        organizationId={getRouteOrganizationId()}
        session={session}
        updateOrganizationUseCase={updateOrganizationUseCase}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "organizations" && session) {
    content = (
      <OrganizationsManagementPage
        listOrganizationsUseCase={listOrganizationsUseCase}
        session={session}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "user-details" && session) {
    content = (
      <UserDetailsPage
        getOrganizationUseCase={getOrganizationUseCase}
        getUserProfileUseCase={getUserProfileUseCase}
        listComplaintsByUserIdUseCase={listComplaintsByUserIdUseCase}
        updateComplaintStatusUseCase={updateComplaintStatusUseCase}
        listOrganizationDocumentsUseCase={listOrganizationDocumentsUseCase}
        listOrganizationMembersUseCase={listOrganizationMembersUseCase}
        listOrganizationSubscriptionsUseCase={listOrganizationSubscriptionsUseCase}
        listPaymentsUseCase={listPaymentsUseCase}
        updateUserUseCase={updateUserUseCase}
        session={session}
        userId={getRouteUserId()}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "documents" && session) {
    content = (
      <DocumentsManagementPage
        deleteDocumentUseCase={deleteDocumentUseCase}
        listDocumentsUseCase={listDocumentsUseCase}
        session={session}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "billing" && session) {
    content = (
      <BillingPage
        deletePaymentUseCase={deletePaymentUseCase}
        getUserProfileUseCase={getUserProfileUseCase}
        listPaymentsUseCase={listPaymentsUseCase}
        session={session}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "complaints" && session) {
    content = (
      <ComplaintsManagementPage
        listComplaintsUseCase={listComplaintsUseCase}
        session={session}
        updateComplaintStatusUseCase={updateComplaintStatusUseCase}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "admins" && session) {
    content = (
      <AdminsManagementPage
        createAdminUseCase={createAdminUseCase}
        deleteAdminUseCase={deleteAdminUseCase}
        listAdminsUseCase={listAdminsUseCase}
        sendPasswordResetUseCase={sendPasswordResetUseCase}
        session={session}
        updateAdminUseCase={updateAdminUseCase}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "billing-plans" && session) {
    content = (
      <PlansManagementPage
        createSubscriptionPlanUseCase={createSubscriptionPlanUseCase}
        deleteSubscriptionPlanUseCase={deleteSubscriptionPlanUseCase}
        listSubscriptionPlansUseCase={listSubscriptionPlansUseCase}
        session={session}
        updateSubscriptionPlanUseCase={updateSubscriptionPlanUseCase}
        onNavigate={navigateRoute}
      />
    );
  } else if (appRoute === "settings" && session) {
    content = (
      <SettingsPage
        onNavigate={navigateRoute}
        sendPasswordResetUseCase={sendPasswordResetUseCase}
        session={session}
        updateAdminUseCase={updateAdminUseCase}
      />
    );
  } else if (appRoute === "forgot-password") {
    content = <ForgotPasswordPage sendPasswordResetUseCase={sendPasswordResetUseCase} />;
  } else {
    content = (
      <LoginPage
        signInUseCase={signInUseCase}
        onForgotPassword={() => navigateRoute("/forgot-password")}
        onSignedIn={handleSignedIn}
      />
    );
  }

  return <AdminShellContext.Provider value={{ signOut: handleSignOut }}>{content}</AdminShellContext.Provider>;
}

function getAppRoute() {
  if (window.location.pathname === "/forgot-password") return "forgot-password";
  if (window.location.pathname === "/billing/plans") return "billing-plans";
  if (window.location.pathname === "/admins") return "admins";
  if (window.location.pathname === "/settings") return "settings";
  if (window.location.pathname === "/dashboard") return "dashboard";
  if (/^\/users\/[^/]+$/.test(window.location.pathname)) return "user-details";
  if (window.location.pathname === "/users") return "users";
  if (/^\/organizations\/[^/]+$/.test(window.location.pathname)) return "organization-details";
  if (window.location.pathname === "/organizations") return "organizations";
  if (window.location.pathname === "/documents") return "documents";
  if (window.location.pathname === "/billing") return "billing";
  if (window.location.pathname === "/complaints") return "complaints";
  return "login";
}

function getRouteUserId() {
  const match = window.location.pathname.match(/^\/users\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function getRouteOrganizationId() {
  const match = window.location.pathname.match(/^\/organizations\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}
