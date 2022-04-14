import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import useInput from "../hooks/useInput";
import { useStore } from "../store";

const Main = () => {
  const navigater = useNavigate();
  const [room, onChangeRoom] = useInput("");
  const [nickname, onChangeNickname] = useInput("");
  const { setNickname } = useStore();
  const onClickBtn = () => {
    setNickname(nickname);
    navigater(`/room/${room}`);
  };

  return (
    <div>
      <input value={room} onChange={onChangeRoom} placeholder="방이름" />
      <input
        value={nickname}
        onChange={onChangeNickname}
        placeholder="닉네임"
      />
      <button onClick={() => onClickBtn()}>방입장</button>
    </div>
  );
};

export default Main;
