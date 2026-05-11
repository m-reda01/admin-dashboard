import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { AppAlert } from "../components/AppAlert.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { ManagementIndexLayout } from "../layouts/ManagementIndexLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { isOrganizationScopedRole, userOrganizationLinkId } from "../users/userOrganizationContext.js";

const USERS_PAGE_SIZE = 10;

export function UsersManagementPage({
  deleteUserUseCase,
  listUsersUseCase,
  onNavigate,
  session,
  updateUserUseCase,
}) {
  const { language, t } = useI18n();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserIds, setSelectedUserIds] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [pendingDeleteUsers, setPendingDeleteUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(createEmptyEditForm());
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setIsLoading(true);
      setError("");

      try {
        const nextUsers = await listUsersUseCase.execute({ pageSize: 50 });
        if (isMounted) {
          setUsers(nextUsers);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.message || t("usersManagement.loadError"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [listUsersUseCase, t]);

  const visibleUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const isStatusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);

      if (!isStatusMatch) return false;
      if (!normalizedQuery) return true;

      return [
        getDisplayName(user),
        user.email,
        user.uid,
        user.role,
        user.walletAddress,
        user.contractState,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [searchQuery, statusFilter, users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / USERS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageUsers = visibleUsers.slice(
    (safeCurrentPage - 1) * USERS_PAGE_SIZE,
    safeCurrentPage * USERS_PAGE_SIZE,
  );
  const pageUserIds = useMemo(() => pageUsers.map((user) => user.id), [pageUsers]);
  const selectedVisibleCount = pageUserIds.filter((id) => selectedUserIds.has(id)).length;
  const isAllVisibleSelected = pageUserIds.length > 0 && selectedVisibleCount === pageUserIds.length;
  const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;
  const paginationPages = getPaginationPages(safeCurrentPage, totalPages);
  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.has(user.id)),
    [selectedUserIds, users],
  );
  const isSelectionMode = selectedUsers.length > 0;

  function handleSelectAllVisible(event) {
    const shouldSelect = event.target.checked;
    setSelectedUserIds((currentIds) => {
      const nextIds = new Set(currentIds);
      pageUserIds.forEach((id) => {
        if (shouldSelect) {
          nextIds.add(id);
        } else {
          nextIds.delete(id);
        }
      });
      return nextIds;
    });
  }

  function handleSelectUser(userId, shouldSelect) {
    setSelectedUserIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (shouldSelect) {
        nextIds.add(userId);
      } else {
        nextIds.delete(userId);
      }
      return nextIds;
    });
  }

  function goToPage(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function handleDeleteUser(user) {
    setPendingDeleteUsers([user]);
  }

  function handleEditUser(user) {
    setEditingUser(user);
    setEditForm({
      displayName: getDisplayName(user),
      isActive: Boolean(user.isActive),
      role: getEditableRole(user.role),
    });
  }

  async function handleSaveUser(event) {
    event.preventDefault();
    if (!editingUser) return;

    const displayName = editForm.displayName.trim();
    if (!displayName) {
      setAlert({
        message: t("usersManagement.editNameRequired"),
        variant: "error",
      });
      return;
    }

    setIsSavingUser(true);
    setAlert(null);

    try {
      const updatedUser = await updateUserUseCase.execute({
        userId: editingUser.id,
        user: {
          ...editingUser,
          displayName,
          isActive: editForm.isActive,
          role: editForm.role,
        },
      });

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === editingUser.id ? updatedUser : user)),
      );
      setEditingUser(null);
      setAlert({
        message: t("usersManagement.editSuccess", { name: displayName }),
        variant: "success",
      });
    } catch {
      setAlert({
        message: t("usersManagement.editError"),
        variant: "error",
      });
    } finally {
      setIsSavingUser(false);
    }
  }

  function handleDeleteSelectedUsers() {
    if (selectedUsers.length === 0) return;
    setPendingDeleteUsers(selectedUsers);
  }

  async function confirmDeleteUsers() {
    if (pendingDeleteUsers.length === 0) return;

    const usersToDelete = pendingDeleteUsers;
    const isBulkDelete = usersToDelete.length > 1;
    const deletedIds = [];
    setAlert(null);

    try {
      for (const user of usersToDelete) {
        setDeletingUserId(user.id);
        await deleteUserUseCase.execute({ userId: user.uid || user.id });
        deletedIds.push(user.id);
      }

      removeDeletedUsers(deletedIds);
      setAlert({
        message: isBulkDelete
          ? t("usersManagement.bulkDeleteSuccess", { count: usersToDelete.length })
          : t("usersManagement.deleteSuccess", { name: getDisplayName(usersToDelete[0]) }),
        variant: "success",
      });
    } catch (deleteError) {
      if (deletedIds.length > 0) {
        removeDeletedUsers(deletedIds);
      }

      setAlert({
        message: deletedIds.length > 0
          ? t("usersManagement.bulkDeletePartial", {
              count: usersToDelete.length,
              deletedCount: deletedIds.length,
            })
          : getDeleteErrorMessage(deleteError, t),
        variant: "error",
      });
    } finally {
      setDeletingUserId("");
      setPendingDeleteUsers([]);
    }
  }

  function removeDeletedUsers(deletedIds) {
    const deletedIdSet = new Set(deletedIds);
    setUsers((currentUsers) => currentUsers.filter((item) => !deletedIdSet.has(item.id)));
    setSelectedUserIds((currentIds) => {
      const nextIds = new Set(currentIds);
      deletedIds.forEach((id) => nextIds.delete(id));
      return nextIds;
    });
  }

  return (
    <DashboardLayout activePage="users" onNavigate={onNavigate} session={session} title={t("usersManagement.title")}>
      <ManagementIndexLayout
        toolbarAlert={
          <AppAlert message={alert?.message} variant={alert?.variant} onClose={() => setAlert(null)} />
        }
        toolbarActions={
          <>
            <label className="users-search">
              <Search size={18} />
              <input
                type="search"
                disabled={isSelectionMode}
                placeholder={t("usersManagement.search")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <label className="users-filter-select">
              <select
                value={statusFilter}
                disabled={isSelectionMode}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">{t("usersManagement.allStatuses")}</option>
                <option value="active">{t("usersManagement.active")}</option>
                <option value="inactive">{t("usersManagement.inactive")}</option>
              </select>
              <ChevronDown size={16} />
            </label>
            {isSelectionMode && (
              <button
                className="users-bulk-delete-button"
                type="button"
                disabled={Boolean(deletingUserId)}
                onClick={handleDeleteSelectedUsers}
              >
                <Trash2 size={16} />
                {t("usersManagement.deleteSelected", { count: selectedUsers.length })}
              </button>
            )}
          </>
        }
      >
        <div className="users-table-shell">
          <div className="users-table-scroll">
            <table className="users-table">
              <colgroup>
                <col className="users-col-checkbox" />
                <col className="users-col-name" />
                <col className="users-col-role" />
                <col className="users-col-status" />
                <col className="users-col-date" />
                <col className="users-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th className="users-checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label={t("usersManagement.selectAll")}
                      checked={isAllVisibleSelected}
                      disabled={pageUsers.length === 0}
                      ref={(element) => {
                        if (element) element.indeterminate = isSomeVisibleSelected;
                      }}
                      onChange={handleSelectAllVisible}
                    />
                  </th>
                  <th>{t("usersManagement.name")}</th>
                  <th>{t("usersManagement.role")}</th>
                  <th>{t("usersManagement.status")}</th>
                  <th>
                    <span className="users-sort-heading">{t("usersManagement.dateJoined")}</span>
                  </th>
                  <th>{t("usersManagement.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <UsersTableShimmerRows />}

                {!isLoading && error && (
                  <tr>
                    <td className="users-empty-cell users-empty-cell--error" colSpan={6}>
                      {t("usersManagement.loadError")}
                    </td>
                  </tr>
                )}

                {!isLoading && !error && visibleUsers.length === 0 && (
                  <tr>
                    <td className="users-empty-cell" colSpan={6}>
                      {t("usersManagement.empty")}
                    </td>
                  </tr>
                )}

                {!isLoading && !error && pageUsers.map((user) => {
                  const displayName = getDisplayName(user);

                  return (
                    <tr
                      className={selectedUserIds.has(user.id) ? "is-selected" : ""}
                      key={user.id}
                    >
                      <td className="users-checkbox-cell">
                        <input
                          type="checkbox"
                          aria-label={`${t("usersManagement.selectUser")} ${displayName}`}
                          checked={selectedUserIds.has(user.id)}
                          onChange={(event) => handleSelectUser(user.id, event.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="users-name-cell">
                          <Avatar user={user} displayName={displayName} />
                          <span>
                            <strong>{displayName}</strong>
                            <small>{user.email || "-"}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        {userOrganizationLinkId(user) && isOrganizationScopedRole(user.role) ? (
                          <button
                            type="button"
                            className="users-role users-role--org-link"
                            data-testid={`users-table-role-org-${user.id}`}
                            disabled={isSelectionMode}
                            aria-label={t("usersManagement.openOrganizationFromRole")}
                            onClick={() =>
                              onNavigate(`/organizations/${encodeURIComponent(userOrganizationLinkId(user))}`)
                            }
                          >
                            {formatRole(user.role, t)}
                          </button>
                        ) : (
                          <span className="users-role">{formatRole(user.role, t)}</span>
                        )}
                      </td>
                      <td>
                        <StatusPill
                          tone={user.isActive ? "activated" : "deactivated"}
                          value={user.isActive ? t("usersManagement.active") : t("usersManagement.inactive")}
                        />
                      </td>
                      <td>{formatDate(user.createdAt, language)}</td>
                      <td>
                        <div className="users-actions-cell">
                          <button
                            type="button"
                            aria-label={t("usersManagement.view")}
                            disabled={isSelectionMode}
                            onClick={() => onNavigate(`/users/${encodeURIComponent(user.uid || user.id)}`)}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={t("usersManagement.edit")}
                            disabled={isSelectionMode}
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            className="is-danger"
                            aria-label={t("usersManagement.delete")}
                            disabled={isSelectionMode || deletingUserId === user.id}
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="users-pagination">
            <button type="button" disabled={isSelectionMode || safeCurrentPage === 1} onClick={() => goToPage(1)}><ChevronsLeft size={16} /></button>
            <button type="button" disabled={isSelectionMode || safeCurrentPage === 1} onClick={() => goToPage(safeCurrentPage - 1)}><ChevronDown className="rotate-90" size={16} /></button>
            {paginationPages.map((page) => (
              <button
                className={page === safeCurrentPage ? "is-active" : ""}
                type="button"
                key={page}
                disabled={isSelectionMode}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
            <button type="button" disabled={isSelectionMode || safeCurrentPage === totalPages} onClick={() => goToPage(safeCurrentPage + 1)}><ChevronDown className="rotate-minus-90" size={16} /></button>
            <button type="button" disabled={isSelectionMode || safeCurrentPage === totalPages} onClick={() => goToPage(totalPages)}><ChevronsRight size={16} /></button>
          </div>
        </div>

        <DeleteUserDialog
          isDeleting={Boolean(deletingUserId)}
          onCancel={() => setPendingDeleteUsers([])}
          onConfirm={confirmDeleteUsers}
          t={t}
          users={pendingDeleteUsers}
        />
        <EditUserDialog
          form={editForm}
          isSaving={isSavingUser}
          onCancel={() => setEditingUser(null)}
          onChange={setEditForm}
          onSubmit={handleSaveUser}
          t={t}
          user={editingUser}
        />
      </ManagementIndexLayout>
    </DashboardLayout>
  );
}

function createEmptyEditForm() {
  return {
    displayName: "",
    isActive: true,
    role: "individual",
  };
}

function getEditableRole(role) {
  const normalizedRole = role?.trim().toLowerCase();
  return ["individual", "org_member", "org_owner"].includes(normalizedRole)
    ? normalizedRole
    : "individual";
}

function getDeleteErrorMessage(error, t) {
  if (error?.code === "permission-denied") {
    return t("usersManagement.deletePermissionDenied");
  }

  if (error?.code === "delete-service-unavailable") {
    return t("usersManagement.deleteServiceUnavailable");
  }

  return t("usersManagement.deleteError");
}

function UsersTableShimmerRows() {
  return Array.from({ length: USERS_PAGE_SIZE }, (_, index) => (
    <tr className="users-shimmer-row" key={`users-shimmer-${index}`}>
      <td className="users-checkbox-cell">
        <span className="users-shimmer users-shimmer-checkbox" />
      </td>
      <td>
        <div className="users-shimmer-name">
          <span className="users-shimmer users-shimmer-avatar" />
          <span className="users-shimmer-lines">
            <span className="users-shimmer users-shimmer-line users-shimmer-line--name" />
            <span className="users-shimmer users-shimmer-line users-shimmer-line--email" />
          </span>
        </div>
      </td>
      <td>
        <span className="users-shimmer users-shimmer-line users-shimmer-line--role" />
      </td>
      <td>
        <span className="users-shimmer users-shimmer-pill" />
      </td>
      <td>
        <span className="users-shimmer users-shimmer-line users-shimmer-line--date" />
      </td>
      <td>
        <span className="users-shimmer-actions">
          <span className="users-shimmer users-shimmer-icon" />
          <span className="users-shimmer users-shimmer-icon" />
          <span className="users-shimmer users-shimmer-icon" />
        </span>
      </td>
    </tr>
  ));
}

function DeleteUserDialog({ isDeleting, onCancel, onConfirm, t, users }) {
  if (!users.length) return null;

  const isBulkDelete = users.length > 1;
  const displayName = isBulkDelete ? "" : getDisplayName(users[0]);

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        aria-labelledby="delete-user-dialog-title"
        aria-modal="true"
        className="confirm-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-icon">
            <Trash2 size={22} />
          </span>
          <div>
            <h2 id="delete-user-dialog-title">
              {isBulkDelete
                ? t("usersManagement.bulkDeleteDialogTitle")
                : t("usersManagement.deleteDialogTitle")}
            </h2>
            <p>
              {isBulkDelete
                ? t("usersManagement.bulkDeleteDialogDescription", { count: users.length })
                : t("usersManagement.deleteDialogDescription", { name: displayName })}
            </p>
          </div>
        </div>

        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-button confirm-dialog-button--neutral" type="button" onClick={onCancel}>
            {t("usersManagement.cancel")}
          </button>
          <button
            className="confirm-dialog-button confirm-dialog-button--danger"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? t("usersManagement.deleting") : t("usersManagement.confirmDelete")}
          </button>
        </div>
      </section>
    </div>
  );
}

function EditUserDialog({ form, isSaving, onCancel, onChange, onSubmit, t, user }) {
  if (!user) return null;

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        aria-labelledby="edit-user-dialog-title"
        aria-modal="true"
        className="edit-user-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="edit-user-dialog-header">
          <div>
            <h2 id="edit-user-dialog-title">{t("usersManagement.editDialogTitle")}</h2>
            <p>{user.email || "-"}</p>
          </div>
        </div>

        <form className="edit-user-form" onSubmit={onSubmit}>
          <label>
            <span>{t("usersManagement.editDisplayName")}</span>
            <input
              value={form.displayName}
              onChange={(event) => onChange({ ...form, displayName: event.target.value })}
            />
          </label>

          <label>
            <span>{t("usersManagement.email")}</span>
            <input disabled value={user.email || "-"} />
          </label>

          <label>
            <span>{t("usersManagement.status")}</span>
            <select
              value={form.isActive ? "active" : "inactive"}
              onChange={(event) =>
                onChange({ ...form, isActive: event.target.value === "active" })
              }
            >
              <option value="active">{t("usersManagement.active")}</option>
              <option value="inactive">{t("usersManagement.inactive")}</option>
            </select>
          </label>

          <div className="confirm-dialog-actions">
            <button
              className="confirm-dialog-button confirm-dialog-button--neutral"
              type="button"
              onClick={onCancel}
            >
              {t("usersManagement.cancel")}
            </button>
            <button
              className="confirm-dialog-button confirm-dialog-button--primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? t("usersManagement.saving") : t("usersManagement.saveChanges")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage === 1) return [1, 2, 3];
  if (currentPage === totalPages) return [totalPages - 2, totalPages - 1, totalPages];
  return [currentPage - 1, currentPage, currentPage + 1];
}

function Avatar({ displayName, user }) {
  if (user.photoUrl) {
    return <img className="users-avatar users-avatar-image" src={user.photoUrl} alt="" />;
  }

  return <span className="users-avatar">{getInitials(displayName)}</span>;
}

function StatusPill({ tone, value }) {
  return <span className={`users-pill users-pill--${tone}`}>{value}</span>;
}

function getDisplayName(user) {
  return user.displayName?.trim() || user.email || "User";
}

function getInitials(value) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0][0], words[1][0]] : [value[0], value[1]];
  return letters.filter(Boolean).join("").toUpperCase();
}

function formatRole(role, t) {
  if (!role) return "-";
  const normalizedRole = role.trim().toLowerCase().replace(/\s+/g, "_");
  const translatedRole = t(`usersManagement.roles.${normalizedRole}`);

  if (translatedRole !== `usersManagement.roles.${normalizedRole}`) {
    return translatedRole;
  }

  return role
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date, language) {
  if (!date) return "-";

  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
