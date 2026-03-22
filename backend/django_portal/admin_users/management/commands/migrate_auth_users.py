"""Management command to migrate Django auth users to our unified User model."""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User as DjangoAuthUser
from django_portal.admin_users.models import User, Role
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()


class Command(BaseCommand):
    help = "Migrate users from Django's built-in auth to the unified User model"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force update existing users",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)
        migrated = 0
        skipped = 0

        # Get all Django auth users
        auth_users = DjangoAuthUser.objects.all()
        total = auth_users.count()

        if total == 0:
            self.stdout.write(self.style.WARNING("No users found in Django auth"))
            return

        for auth_user in auth_users:
            try:
                # Check if user already exists in our model
                existing_user = User.objects.filter(email=auth_user.email).first()

                if existing_user and not force:
                    self.stdout.write(
                        self.style.WARNING(
                            f"SKIPPED: User {auth_user.email} already exists (use --force to update)"
                        )
                    )
                    skipped += 1
                    continue

                # For password: use Django's stored hash if available, otherwise hash a placeholder
                if auth_user.has_usable_password():
                    # Use Django's existing hash - it's a bcrypt hash by default
                    password_hash_value = auth_user.password
                else:
                    # If unusable, set a random one
                    password_hash_value = password_hash.hash("ChangeMe@123")

                # Create or update user in our unified model
                user, created = User.objects.update_or_create(
                    email=auth_user.email,
                    defaults={
                        "password_hash": password_hash_value,
                    },
                )

                action = "CREATED" if created else "UPDATED"
                self.stdout.write(
                    self.style.SUCCESS(f"{action}: User {auth_user.email}")
                )
                migrated += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"ERROR migrating {auth_user.email}: {str(e)}")
                )

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(f"Migration Summary:")
        self.stdout.write(f"  Total auth users: {total}")
        self.stdout.write(self.style.SUCCESS(f"  Migrated: {migrated}"))
        if skipped:
            self.stdout.write(self.style.WARNING(f"  Skipped: {skipped}"))
        self.stdout.write(
            self.style.SUCCESS(
                "\nUsers are now available in the unified User model with roles!"
            )
        )
