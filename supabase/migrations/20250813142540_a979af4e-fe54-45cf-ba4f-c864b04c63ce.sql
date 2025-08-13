-- Add onboarding_banner_dismissed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN onboarding_banner_dismissed boolean NOT NULL DEFAULT false;