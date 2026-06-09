package com.chineseapp.service;

import java.util.UUID;

public interface AccountService {

    void changePassword(UUID userId, String currentPassword, String newPassword);

    void deleteAccount(UUID userId, String currentPassword, String confirmation);
}
