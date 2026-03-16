from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import LoginSerializer

class LoginAPIView(TokenObtainPairView):
   permission_classes = [AllowAny]
   serializer_class = LoginSerializer

class RefreshAPIView(TokenRefreshView):
   permission_classes = [AllowAny]

class LogoutAPIView(APIView):
   permission_classes = [IsAuthenticated]
   def post(self, request):
       refresh_token = request.data.get("refresh")
       if not refresh_token:
           return Response(
               {"detail": "Refresh token is required."},
               status=status.HTTP_400_BAD_REQUEST,
           )
       try:
           token = RefreshToken(refresh_token)
           token.blacklist()
       except Exception:
           return Response(
               {"detail": "Invalid or expired refresh token."},
               status=status.HTTP_400_BAD_REQUEST,
           )
       return Response(
           {"detail": "Logged out successfully."},
           status=status.HTTP_200_OK,
       )

class MeAPIView(APIView):
   permission_classes = [IsAuthenticated]
   def get(self, request):
       user = request.user
       return Response(
           {
               "id": user.id,
               "username": user.username,
               "email": user.email,
               "is_active": user.is_active,
           }
       )