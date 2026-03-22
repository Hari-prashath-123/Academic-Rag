from django import forms
from pwdlib import PasswordHash

from .models import User

password_hash = PasswordHash.recommended()


class UserAdminForm(forms.ModelForm):
    password = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Set a plain password. It will be hashed into password_hash.",
    )

    class Meta:
        model = User
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
            instance.password_hash = password_hash.hash(password)
        if commit:
            instance.save()
        return instance
