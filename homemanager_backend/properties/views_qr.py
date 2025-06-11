from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
import qrcode
import base64
from io import BytesIO

from .models import Property, Unit
from .permissions import IsPropertyManager, IsPropertyOwner


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bulk_qr_codes(request):
    """
    Get QR codes for multiple units in one request
    ?units=1,2,3,4
    """
    # Get unit IDs from query parameters
    unit_ids_param = request.query_params.get('units', '')
    
    if not unit_ids_param:
        return Response(
            {"error": "No unit IDs provided. Use ?units=1,2,3..."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Convert comma-separated IDs to list
        unit_ids = [int(id) for id in unit_ids_param.split(',')]
    except ValueError:
        return Response(
            {"error": "Invalid unit ID format. Use integers separated by commas."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get units that user has access to
    user_properties = Property.objects.filter(
        organization__in=request.user.organizations.all()
    ).values_list('id', flat=True)
    
    accessible_units = Unit.objects.filter(
        property_id__in=user_properties,
        id__in=unit_ids
    )
    
    if not accessible_units.exists():
        return Response(
            {"error": "No accessible units found with the provided IDs"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Generate QR codes for each unit
    results = []
    
    for unit in accessible_units:
        # Create QR code for tenant portal link
        qr_data = f"https://homemanager.app/tenant-portal/unit/{unit.id}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert QR image to base64 for embedding in PDF
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        # Add to results
        results.append({
            "unit_id": unit.id,
            "property_id": unit.property_id,
            "unit_number": unit.unit_number,
            "qr_base64": img_str
        })
    
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def property_qr_codes(request, pk):
    """
    Get QR codes for all units of a specific property
    """
    try:
        property = Property.objects.get(pk=pk)
    except Property.DoesNotExist:
        return Response(
            {"error": "Property not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if user has access to this property
    if property.organization not in request.user.organizations.all():
        return Response(
            {"error": "You don't have access to this property"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    units = Unit.objects.filter(property=property)
    
    # Generate QR codes for each unit
    results = []
    
    for unit in units:
        # Create QR code for tenant portal link
        qr_data = f"https://homemanager.app/tenant-portal/unit/{unit.id}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert QR image to base64 for embedding in PDF
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        # Add to results
        results.append({
            "unit_id": unit.id,
            "property_id": unit.property_id,
            "unit_number": unit.unit_number,
            "qr_base64": img_str
        })
    
    return Response(results)
