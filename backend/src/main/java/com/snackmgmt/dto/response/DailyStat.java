package com.snackmgmt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyStat {
    private String date;
    private String day;
    private long morning;
    private long evening;
    private long night;
}
