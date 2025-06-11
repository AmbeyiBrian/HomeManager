from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'notices', views.NoticeViewSet)
router.register(r'notice-views', views.NoticeViewViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
