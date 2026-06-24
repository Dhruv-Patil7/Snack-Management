package com.snackmgmt.entity;

import com.snackmgmt.enums.RedemptionMode;
import com.snackmgmt.enums.SnackSession;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "redemptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Redemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "distributor_id", nullable = false)
    private User distributor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SnackSession session;

    @Enumerated(EnumType.STRING)
    @Column(name = "redemption_mode", nullable = false, length = 20)
    private RedemptionMode redemptionMode;

    @Column(name = "snack_item", length = 100)
    private String snackItem;

    @Column(name = "redeemed_at", nullable = false)
    @Builder.Default
    private LocalDateTime redeemedAt = LocalDateTime.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
