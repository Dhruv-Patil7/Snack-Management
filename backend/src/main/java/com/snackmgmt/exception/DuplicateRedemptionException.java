package com.snackmgmt.exception;

public class DuplicateRedemptionException extends RuntimeException {

    private final String redeemedAt;

    public DuplicateRedemptionException(String session, String redeemedAt) {
        super(session + " snack already redeemed at " + redeemedAt);
        this.redeemedAt = redeemedAt;
    }

    public String getRedeemedAt() {
        return redeemedAt;
    }
}
