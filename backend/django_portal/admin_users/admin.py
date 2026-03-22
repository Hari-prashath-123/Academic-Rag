from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin
from django.contrib.auth.models import Group

from .forms import UserAdminForm
from .models import User, Role, RolePermission, UserRole, Profile

# Unregister Django's built-in auth models to keep only our unified User model
try:
    admin.site.unregister(Group)
except admin.sites.NotRegistered:
    pass


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    form = UserAdminForm
    list_display = ("email", "created_at", "updated_at")
    search_fields = ("email",)
    readonly_fields = ("id", "created_at", "updated_at", "password_hash")
    fields = ("id", "email", "password", "password_hash", "created_at", "updated_at")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)
    readonly_fields = ("id",)
    fields = ("id", "name", "description")


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 1
    fields = ("permission_name",)


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "permission_name")
    search_fields = ("role__name", "permission_name")
    readonly_fields = ("id",)
    list_filter = ("role__name",)


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    search_fields = ("user__email", "role__name")
    list_filter = ("role__name",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "first_name", "last_name", "phone")
    search_fields = ("user__email", "first_name", "last_name")
    readonly_fields = ("id", "user")
    fields = ("id", "user", "first_name", "last_name", "avatar_url", "phone")
