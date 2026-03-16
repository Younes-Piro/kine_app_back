from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile

class ProfileSerializer(serializers.ModelSerializer):
   class Meta:
       model = Profile
       fields = ["role", "is_active"]

class UserListSerializer(serializers.ModelSerializer):
   role = serializers.CharField(source="profile.role", read_only=True)
   profile_active = serializers.BooleanField(source="profile.is_active", read_only=True)
   class Meta:
       model = User
       fields = ["id", "username", "email", "is_active", "role", "profile_active"]

class UserCreateSerializer(serializers.ModelSerializer):
   role = serializers.ChoiceField(choices=Profile.ROLE_CHOICES, write_only=True)
   password = serializers.CharField(write_only=True, min_length=6)
   class Meta:
       model = User
       fields = ["id", "username", "email", "password", "role"]
   def create(self, validated_data):
       role = validated_data.pop("role", Profile.ROLE_STAFF)
       password = validated_data.pop("password")
       user = User(**validated_data)
       user.set_password(password)
       user.save()
       user.profile.role = role
       user.profile.save()
       return user

class UserUpdateSerializer(serializers.ModelSerializer):
   role = serializers.ChoiceField(choices=Profile.ROLE_CHOICES, required=False)
   class Meta:
       model = User
       fields = ["username", "email", "is_active", "role"]
   def update(self, instance, validated_data):
       role = validated_data.pop("role", None)
       for attr, value in validated_data.items():
           setattr(instance, attr, value)
       instance.save()
       if role is not None:
           instance.profile.role = role
           instance.profile.save()
       return instance

class UserDetailSerializer(serializers.ModelSerializer):
   role = serializers.CharField(source="profile.role", read_only=True)
   profile_active = serializers.BooleanField(source="profile.is_active", read_only=True)
   class Meta:
       model = User
       fields = ["id", "username", "email", "is_active", "role", "profile_active"]

