-- Migration: Add RLS policies for device token authentication
-- This allows the desktop agent to authenticate using device_token without a user session

-- Allow SELECT by device_token (for desktop agent to verify its token)
CREATE POLICY "Device token authentication" ON public.devices
    FOR SELECT USING (device_token IS NOT NULL);

-- Allow UPDATE by device_token (for desktop agent to update online status)
CREATE POLICY "Device token can update own device" ON public.devices
    FOR UPDATE USING (device_token IS NOT NULL);
