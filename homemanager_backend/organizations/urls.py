from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'organizations', views.OrganizationViewSet)
router.register(r'subscriptions/plans', views.SubscriptionPlanViewSet)
router.register(r'subscriptions', views.SubscriptionViewSet)
router.register(r'subscription-payments', views.SubscriptionPaymentViewSet)
router.register(r'roles', views.OrganizationRoleViewSet)
router.register(r'memberships', views.OrganizationMembershipViewSet)
router.register(r'base-roles', views.BaseRoleViewSet)
router.register(r'role-customizations', views.OrganizationRoleCustomizationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
