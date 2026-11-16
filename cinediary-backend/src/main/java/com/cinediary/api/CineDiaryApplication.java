package com.cinediary.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CineDiaryApplication {

    public static void main(String[] args) {
        SpringApplication.run(CineDiaryApplication.class, args);
    }
}
