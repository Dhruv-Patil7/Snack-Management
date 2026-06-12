package com.snackmgmt.dto.request;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String username;
    private String role;
}
