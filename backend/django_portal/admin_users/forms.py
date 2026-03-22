from django import forms
from passlib.context import CryptContext

from .models import PortalUser

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class PortalUserAdminForm(forms.ModelForm):
    password = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Set a plain password. It will be hashed into password_hash.",
    )

    class Meta:
        model = PortalUser
        fields = ["email", "password"]

    def clean(self):
        cleaned = super().clean()
        password = cleaned.get("password")

        if self.instance and self.instance.pk:
            return cleaned

        if not password:
            raise forms.ValidationError("Password is required when creating a user.")

        return cleaned

    def save(self, commit=True):
        instance = super().save(commit=False)
        password = self.cleaned_data.get("password")
        if password:
            instance.password_hash = pwd_context.hash(password)
        if commit:
            instance.save()
        return instance
