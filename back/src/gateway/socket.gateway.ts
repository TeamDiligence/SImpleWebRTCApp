import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
// import { Server } from 'ws';
import { Socket, Server } from 'socket.io';

interface userType {
  id: string;
  nickname: string;
}

@WebSocketGateway({ transports: ['websocket'], cors: true })
export class SocketGateway
  implements OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection
{
  @WebSocketServer() server: Server;

  private logger = new Logger();
  private activeSockets: { room: string; id: string }[] = [];
  private simpleRoom: {
    [key: string]: string;
  } = {};
  private users:
    | {
        [key: string]: userType[];
      }
    | {} = {};
  private MAXIMUM = 2;
  // 1:n 인 채팅방이 여러개 있음.
  /*
    방 정보 에는 : room 
    user : {
      room : [{
        nickname : string
        socketId : string,
      }]
    }
  */
  @SubscribeMessage('join_room')
  public joinRoom(client: Socket, data: { room: string; nickname: string }) {
    this.logger.log(`${data.nickname} 연결!`);
    if (this.users[data.room]) {
      const roomLength = this.users[data.room].length;
      const existUser = this.users[data.room].find((user) => {
        if (user.id == client.id) {
          return true;
        } else {
          return false;
        }
      });
      if (existUser) {
        return;
      }
      if (roomLength == this.MAXIMUM) {
        this.server.to(client.id).emit('room_full');
        return;
      }

      this.users[data.room].push({ id: client.id, nickname: data.nickname });
    } else {
      this.users[data.room] = [
        {
          id: client.id,
          nickname: data.nickname,
        },
      ];
    }

    this.simpleRoom[client.id] = data.room;

    client.join(data.room);

    const roomUsersInfo = this.users[data.room].filter(
      (user) => user.id != client.id,
    );

    console.log(this.users[data.room]);
    this.server.to(data.room).emit('all_users', roomUsersInfo);
  }

  @SubscribeMessage('offer')
  public CallUser(client: Socket, data: any): void {
    const users = this.users[this.simpleRoom[client.id]].filter(
      (user) => user.id === client.id,
    );
    console.log(users);
    this.logger.log(`[${this.simpleRoom[client.id]}] : ${users[0].nickname}`);
    client.broadcast.emit('getOffer', data);
  }

  @SubscribeMessage('answer')
  public answer(client: Socket, data: any): void {
    client.broadcast.emit('getAnswer', data);
  }

  @SubscribeMessage('candidate')
  public candidate(client: Socket, data: any): void {
    client.broadcast.emit('getCandidate', data);
  }

  public afterInit(server): void {
    this.logger.log('init gateway');
  }

  public handleConnection(client: Socket): void {
    // console.log(client.request);
    this.logger.log(client.id + ' 소켓 연결 됨');
  }

  public handleDisconnect(client: Socket): void {
    this.logger.log(`[${this.simpleRoom[client.id]}] : ${client.id} exit! `);

    const roomInfo = this.simpleRoom[client.id];
    let room = this.users[roomInfo];
    if (room) {
      room = room.filter((user) => user.id !== client.id);
      this.users[roomInfo] = room;
    }

    this.server.to(roomInfo).emit('user_exit', { id: client.id });
  }
}
