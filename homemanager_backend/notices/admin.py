from django.contrib import admin
from .models import Notice, NoticeView

@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ('title', 'property', 'notice_type', 'start_date', 'end_date', 'is_important', 'is_archived')
    list_filter = ('notice_type', 'is_important', 'is_archived', 'property')
    search_fields = ('title', 'content')
    date_hierarchy = 'created_at'


@admin.register(NoticeView)
class NoticeViewAdmin(admin.ModelAdmin):
    list_display = ('notice', 'tenant', 'viewed_at')
    list_filter = ('notice', 'tenant')
    search_fields = ('notice__title', 'tenant__name')
    date_hierarchy = 'viewed_at'
