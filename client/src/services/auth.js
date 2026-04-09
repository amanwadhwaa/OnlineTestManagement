export const ROLES = Object.freeze({
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  TEACHING_ASST: 'teaching_asst',
  ADMIN: 'admin',
});

const ROLE_LABELS = {
  [ROLES.STUDENT]: 'Student',
  [ROLES.INSTRUCTOR]: 'Instructor',
  [ROLES.TEACHING_ASST]: 'Teaching Assistant',
  [ROLES.ADMIN]: 'Admin',
};

export function normalizeRole(role) {
  return (role || '').toString().trim().toLowerCase();
}

export function getRoleFromToken(token) {
  if (!token) return '';

  try {
    const payload = token.split('.')[1];
    if (!payload) return '';

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    const parsed = JSON.parse(decoded);

    return normalizeRole(parsed?.role);
  } catch (error) {
    return '';
  }
}

export function getCurrentUserRole() {
  const storedRole = normalizeRole(localStorage.getItem('role'));
  if (storedRole) {
    return storedRole;
  }

  const token = localStorage.getItem('token') || '';
  const decodedRole = getRoleFromToken(token);

  if (decodedRole) {
    localStorage.setItem('role', decodedRole);
  }

  return decodedRole;
}

export function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);
  return ROLE_LABELS[normalizedRole] || normalizedRole.replace(/_/g, ' ');
}

export function getRoleCapabilities(role) {
  const normalizedRole = normalizeRole(role);

  const isStudent = normalizedRole === ROLES.STUDENT;
  const isInstructor = normalizedRole === ROLES.INSTRUCTOR;
  const isTeachingAssistant = normalizedRole === ROLES.TEACHING_ASST;
  const isAdmin = normalizedRole === ROLES.ADMIN;

  return {
    isStudent,
    isInstructor,
    isTeachingAssistant,
    isAdmin,
    canAttemptTests: isStudent,
    canCreateCourses: isInstructor,
    canCreateQuestionBanks: isInstructor,
    canCreateTests: isInstructor,
    canAddQuestions: isInstructor || isTeachingAssistant,
    canManageTests: isInstructor,
    canViewReadOnly: isTeachingAssistant,
    canViewStudentResults: isInstructor || isAdmin || isTeachingAssistant,
    canAdminUsers: isAdmin,
    canAdminTests: isAdmin,
    canSubmitReport: isStudent || isInstructor || isTeachingAssistant || isAdmin,
    canManageReports: isAdmin,
  };
}

export function storeAuthSession({ token, role, userId }) {
  if (token) {
    localStorage.setItem('token', token);
  }

  const normalizedRole = normalizeRole(role);
  if (normalizedRole) {
    localStorage.setItem('role', normalizedRole);
  }

  if (userId !== undefined && userId !== null) {
    localStorage.setItem('user_id', String(userId));
  }
}
