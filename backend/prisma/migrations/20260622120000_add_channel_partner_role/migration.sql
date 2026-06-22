ALTER TABLE `User`
  MODIFY `role` ENUM(
    'PRE_SALES',
    'SALES',
    'POST_SALES',
    'MANAGER',
    'ADMIN',
    'AGENCY_USER',
    'AGENT',
    'CHANNEL_PARTNER'
  ) NULL;
