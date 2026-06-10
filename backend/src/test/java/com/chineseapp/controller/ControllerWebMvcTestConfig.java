package com.chineseapp.controller;

import com.chineseapp.config.HskProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

@TestConfiguration(proxyBeanMethods = false)
class ControllerWebMvcTestConfig {

    @Bean
    HskProperties hskProperties() {
        return new HskProperties();
    }
}
