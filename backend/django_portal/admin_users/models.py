import uuid

from django.db import models


class User(models.Model):
    """Unified User model for authentication and authorization.
    
    Note: Managed by SQLAlchemy in FastAPI. Django admin provides UI access.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        managed = False
        db_table = "users"

    def __str__(self) -> str:
        return self.email


class Role(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True, db_index=True)
    description = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "roles"

    def __str__(self) -> str:
        return self.name


class RolePermission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, db_column="role_id", related_name="permissions")
    permission_name = models.CharField(max_length=255, db_index=True)

    class Meta:
        managed = False
        db_table = "role_permissions"
        unique_together = ("role", "permission_name")

    def __str__(self) -> str:
        return f"{self.role.name} - {self.permission_name}"


class UserRole(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column="user_id", related_name="user_roles")
    role = models.ForeignKey(Role, on_delete=models.CASCADE, db_column="role_id", related_name="user_roles")

    class Meta:
        managed = False
        db_table = "user_roles"
        unique_together = ("user", "role")

    def __str__(self) -> str:
        return f"{self.user.email} - {self.role.name}"


class Profile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column="user_id", related_name="profile")
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    avatar_url = models.URLField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        managed = False
        db_table = "profiles"

    def __str__(self) -> str:
        return f"Profile: {self.user.email}"
