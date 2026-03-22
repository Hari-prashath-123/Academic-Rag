"""Role-based access control models."""
from sqlalchemy import Column, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from models import Base


class Role(Base):
    """RBAC role model."""

    __tablename__ = "roles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_roles", back_populates="roles", viewonly=True)

    def __repr__(self):
        return f"<Role(id={self.id}, name={self.name})>"


class RolePermission(Base):
    """Permission assigned to a role."""

    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_name", name="uq_role_permission"),)

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_name = Column(String, nullable=False, index=True)

    role = relationship("Role", back_populates="permissions")

    def __repr__(self):
        return f"<RolePermission(id={self.id}, role_id={self.role_id}, permission={self.permission_name})>"


class UserRole(Base):
    """Association model between users and roles."""

    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role"),)

    # Compatibility constants for code paths still checking role names directly.
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")

    def __repr__(self):
        return f"<UserRole(user_id={self.user_id}, role_id={self.role_id})>"
