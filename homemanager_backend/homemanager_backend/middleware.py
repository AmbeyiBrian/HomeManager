"""
Django middleware to silence timezone warning.

This middleware adds a filter to suppress the specific Django warning about naive datetime objects.
Rather than fixing all possible instances where naive datetimes occur, this is a more pragmatic approach
for development environments where these warnings aren't critical.
"""
import warnings
import logging
from django.utils.deprecation import MiddlewareMixin

class SuppressNaiveDatetimeWarningMiddleware(MiddlewareMixin):
    """
    Middleware class that suppresses the Django warning about naive datetime fields.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        # Filter out the specific naive datetime warning
        warnings.filterwarnings(
            'ignore', 
            message='DateTimeField .* received a naive datetime', 
            category=RuntimeWarning
        )
        logging.getLogger('django.request').debug('Naive datetime warnings are now suppressed')
