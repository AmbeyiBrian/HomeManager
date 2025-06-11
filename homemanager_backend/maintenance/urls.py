from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'service-providers', views.ServiceProviderViewSet)
router.register(r'tickets', views.TicketViewSet)
router.register(r'comments', views.TicketCommentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
