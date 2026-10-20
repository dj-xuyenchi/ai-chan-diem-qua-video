package com.theduc.ai.dto;

import java.util.List;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ThemHocSinhRequest {

	private List<Long> hocSinhIds;
}
