from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class LoginSerializer(TokenObtainPairSerializer):
   def validate(self, attrs):
       username = attrs.get("username")
       password = attrs.get("password")
       user = authenticate(
           request=self.context.get("request"),
           username=username,
           password=password,
       )
       if user is None:
           raise serializers.ValidationError("Invalid username or password.")
       if not user.is_active:
           raise serializers.ValidationError("This account is inactive.")
       data = super().validate(attrs)
       data["user"] = {
           "id": user.id,
           "username": user.username,
           "email": user.email,
       }
       return data
   @classmethod
   def get_token(cls, user):
       token = super().get_token(user)
       token["user_id"] = user.id
       token["username"] = user.username
       return token