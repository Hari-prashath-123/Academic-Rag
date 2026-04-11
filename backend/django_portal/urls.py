from django.contrib import admin
from django.urls import path


urlpatterns = [
    # Mounted via FastAPI root: expose Django admin at /admin/.
    path("admin/", admin.site.urls),
]
