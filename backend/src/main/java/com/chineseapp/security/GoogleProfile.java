package com.chineseapp.security;

/**
 * The trusted profile fields extracted from a verified Google ID token.
 * {@code sub} is Google's stable subject id and the identity key we match users on.
 */
public record GoogleProfile(String sub, String email, String name) {
}
