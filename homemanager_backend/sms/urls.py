from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'templates', views.SMSTemplateViewSet)
router.register(r'messages', views.SMSMessageViewSet)
router.register(r'providers', views.SMSProviderViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
