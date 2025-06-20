from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tenants', views.TenantViewSet)
router.register(r'leases', views.LeaseViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
